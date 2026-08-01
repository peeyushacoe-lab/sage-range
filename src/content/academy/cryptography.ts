/**
 * Cryptography for Defenders — full lesson content.
 */

import { type Course, lesson, text, code, callout, check } from "./blocks";

export const CRYPTOGRAPHY: Course = {
  slug: "cryptography-for-defenders",
  modules: [
    {
      title: "Primitives",
      description: "The building blocks and the guarantees they actually offer.",
      lessons: [
        lesson(
          "Encoding, hashing, encryption",
          "Three things routinely confused, with very different consequences.",
          10,
          [
            text(
              "These three get used interchangeably in conversation and mean entirely different things in practice. Conflating them produces real vulnerabilities, usually of the form 'we protected it — it's Base64'.",
            ),
            code(
              `Encoding    Reversible by anyone       Base64, hex, URL-encoding
            Purpose: safe transport
            Security value: none

Hashing     One-way, fixed length      SHA-256, bcrypt, Argon2
            Purpose: integrity, storage
            Security value: cannot recover input

Encryption  Reversible with a key      AES, ChaCha20, RSA
            Purpose: confidentiality
            Security value: depends on key secrecy`,
              "text",
            ),
            text(
              "The practical test: **can I reverse this without a secret?** If yes, it is encoding and provides no protection. Base64 looks unreadable to a human and is trivially reversible by anyone, which is precisely why it keeps appearing in breach write-ups.",
            ),
            callout(
              "danger",
              "Base64 is not protection",
              "Credentials 'obfuscated' with Base64 are stored in plaintext with an extra step. Attackers decode it as a reflex; so should you when reading logs.",
            ),
            check(
              "An application stores API keys Base64-encoded in its configuration. How should this be characterised in a report?",
              [
                "Weak encryption",
                "Plaintext storage — encoding provides no confidentiality",
                "Adequate for non-production systems",
                "Hashing, which is one-way",
              ],
              1,
              "Base64 is reversible without any secret. Describing it as encryption, even weak encryption, misleads whoever reads the finding.",
            ),
          ],
        ),
        lesson(
          "Symmetric and asymmetric",
          "What each is for, and why real systems use both.",
          8,
          [
            text(
              "**Symmetric** encryption uses one key for both directions. It is fast, suited to bulk data, and leaves you with a distribution problem: both parties need the key, and getting it to them safely is the hard part.\n\n**Asymmetric** encryption uses a keypair — public to encrypt, private to decrypt. It solves distribution elegantly and is far too slow for bulk data.",
            ),
            text(
              "Real protocols use both. TLS performs an asymmetric handshake to agree a symmetric session key, then encrypts the actual traffic symmetrically. You get the distribution properties of one and the speed of the other.",
            ),
            callout(
              "info",
              "This is why forward secrecy matters",
              "If the session key is derived ephemerally rather than encrypted under the server's long-term key, recording traffic today and stealing the private key later does not decrypt it. Modern TLS does this by default.",
            ),
            check(
              "Why does TLS use asymmetric cryptography for the handshake but symmetric for the data?",
              [
                "Asymmetric is more secure but slower, so it is used only where needed",
                "Symmetric cannot be used over a network",
                "Asymmetric keys are shorter",
                "It is a legacy design with no current justification",
              ],
              0,
              "Asymmetric solves key agreement between parties who have not met; symmetric is orders of magnitude faster for bulk data. Using each where it is strongest is the whole design.",
            ),
          ],
        ),
        lesson(
          "Integrity and authenticity",
          "Why confidentiality without integrity is rarely enough.",
          8,
          [
            text(
              "Encryption hides content. It does not, by itself, tell you the content arrived unaltered or came from who you think.\n\nWith some older modes, an attacker who cannot read a message can still **modify** it predictably — flipping bits in the ciphertext to flip corresponding bits in the plaintext. Confidentiality holds; integrity does not.",
            ),
            text(
              "The fix is authenticated encryption — AES-GCM, ChaCha20-Poly1305 — which produces a tag alongside the ciphertext. If anything was altered, decryption fails rather than returning corrupted plaintext.",
            ),
            callout(
              "important",
              "Encrypt-then-MAC, and prefer AEAD",
              "Where a mode does not provide it, the ordering matters: authenticate the ciphertext, not the plaintext. Better still, use an AEAD mode and avoid the question entirely.",
            ),
            check(
              "An attacker cannot read an encrypted message but can predictably alter its plaintext by modifying ciphertext bits. What is missing?",
              [
                "A longer key",
                "Integrity protection — an authentication tag over the ciphertext",
                "Forward secrecy",
                "A stronger cipher",
              ],
              1,
              "This is a malleability problem, not a strength problem. AEAD modes make tampering cause decryption to fail rather than succeed with altered content.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Where it goes wrong",
      description: "Failures that appear repeatedly in real assessments.",
      lessons: [
        lesson(
          "Key management",
          "Hardcoded keys, unrotated secrets and the repository that keeps history forever.",
          10,
          [
            text(
              "Almost no real-world cryptographic failure involves breaking an algorithm. They involve keys: committed to repositories, shared between environments, never rotated, or held by more people than anyone can enumerate.",
            ),
            code(
              `Failure                         Why it persists
─────────────────────────────   ────────────────────────────────
Key in source control           git history keeps it after deletion
Same key across environments    a dev compromise becomes production
Key never rotated               age is invisible; nothing prompts
Long-lived static credential    convenient; nobody owns the rotation`,
              "text",
            ),
            text(
              "The structural answer is to stop having long-lived secrets. Credentials issued at runtime, valid for minutes, remove most of this problem — there is no lasting prize to steal, and rotation happens by construction rather than by discipline.",
            ),
            callout(
              "warning",
              "Deleting a committed secret does not remove it",
              "The commit remains in history and in every clone and fork. The only correct response is to treat it as compromised and rotate — rewriting history is a cleanup, not a remediation.",
            ),
            check(
              "A developer removes a hardcoded API key and commits the fix. Is the key safe?",
              [
                "Yes — it is no longer in the current code",
                "No — it remains in git history and must be treated as compromised and rotated",
                "Yes, provided the repository is private",
                "Only if the commit is force-pushed",
              ],
              1,
              "History preserves it, and every existing clone has it. Rotation is the only action that actually resolves the exposure.",
            ),
          ],
        ),
        lesson(
          "Password storage",
          "Why a fast hash is the wrong tool, and what to use instead.",
          8,
          [
            text(
              "Passwords must be stored so that a database breach does not immediately yield credentials. The historical mistake was using fast hashes — MD5, SHA-1, even SHA-256 — because speed is exactly what an attacker cracking offline wants.",
            ),
            code(
              `SHA-256, commodity GPU        ~10,000,000,000 guesses/sec
bcrypt (cost 12)              ~30,000 guesses/sec
Argon2id (tuned)              ~5,000 guesses/sec

The algorithm is not weaker. It is deliberately slower.`,
              "text",
            ),
            text(
              "Deliberately slow functions — bcrypt, scrypt, Argon2 — plus a per-password **salt** to defeat precomputed tables, are the standard. Argon2 additionally resists GPU parallelism by requiring memory as well as time.",
            ),
            check(
              "Why is SHA-256 unsuitable for password storage despite being cryptographically sound?",
              [
                "It produces collisions",
                "It is fast, which favours offline brute-force attacks",
                "It cannot be salted",
                "It is reversible",
              ],
              1,
              "SHA-256 is perfectly good as a hash. Its speed is a virtue for integrity checking and a serious liability when an attacker is guessing offline.",
            ),
          ],
        ),
        lesson(
          "Certificate validation",
          "Trusting a certificate is a decision, not a default.",
          8,
          [
            text(
              "TLS provides confidentiality against an eavesdropper. It provides protection against an *interceptor* only if the client validates the certificate — checking the chain, the hostname, the expiry and revocation.\n\nCode that disables validation to make development easier, and ships that way, has TLS that encrypts to whoever answers.",
            ),
            code(
              `Common and dangerous
  verify=False
  rejectUnauthorized: false
  ServerCertificateValidationCallback = (s,c,ch,e) => true

Each of these makes TLS encrypt to an attacker just as happily.`,
              "text",
            ),
            callout(
              "danger",
              "Self-signed in production means unvalidated",
              "If a client must accept a self-signed certificate, it usually accepts *any* certificate. Pin the specific certificate instead, so exactly one is trusted rather than all of them.",
            ),
            check(
              "An application sets rejectUnauthorized: false to work with an internal service. What is the security impact?",
              [
                "None — traffic is still encrypted",
                "It accepts any certificate, so an interceptor can decrypt and modify traffic",
                "It disables encryption entirely",
                "It only affects certificate expiry checks",
              ],
              1,
              "Encryption continues, but to an unverified party. Anyone able to intercept can present their own certificate and be accepted.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Encryption during an incident",
      description: "Investigating what you cannot read.",
      lessons: [
        lesson(
          "Metadata still speaks",
          "SNI, certificate details, timing and volume.",
          8,
          [
            text(
              "During an incident you will face traffic you cannot decrypt, and the instinct is to treat it as a dead end. It is not. The handshake is unencrypted, and the shape of the traffic is observable regardless.\n\nSNI gives the requested hostname. The certificate gives issuer, subject and validity. Timing and volume give behaviour. Together these frequently identify both the destination and its nature.",
            ),
            callout(
              "tip",
              "Certificate anomalies travel in groups",
              "Self-signed, very short validity, a subject that does not match the SNI, or a CN of 'localhost' on an external host — each is weak alone and compelling together.",
            ),
            code(
              `Observable on an encrypted session

  SNI             api.example.com       hostname requested
  Cert subject    CN=api.example.com    who the server claims to be
  Cert issuer     DigiCert              who vouches for it
  Validity        90 days               short-lived is normal now
  JA3             a0e9f5d6...           which client software
  Bytes / timing  3.1 MB, bursty        behaviour`,
              "text",
            ),
            text(
              "Set that against a session with no SNI, a self-signed certificate naming localhost, an uncommon client fingerprint and a fixed-interval traffic profile. Nothing has been decrypted, and there are already four independent reasons to escalate.",
            ),
            check(
              "What can be determined about an encrypted session without decrypting it?",
              [
                "Nothing of investigative value",
                "Requested hostname, certificate details, client fingerprint, and traffic shape",
                "The full request and response bodies",
                "Only the destination IP address",
              ],
              1,
              "The handshake carries substantial metadata in the clear, and traffic shape is observable throughout. That is often enough to escalate.",
            ),
          ],
        ),
        lesson(
          "Fingerprinting clients",
          "JA3 and JA4 as identification without decryption.",
          8,
          [
            text(
              "Different TLS implementations negotiate differently — cipher suite ordering, extensions offered, elliptic curves supported. Hashing those choices produces a fingerprint that identifies the **software**, not the destination.\n\nThat is powerful during an incident: malware using a custom TLS stack looks nothing like a browser, even when it connects to an entirely respectable-looking domain.",
            ),
            code(
              `JA3 a0e9f5d64349fb13191bc781f81f42e1  → Chrome, common
JA3 51c64c77e60f3980eea90869b68c58a8  → known offensive tooling

Same destination port. Same TLS version. Different software.`,
              "text",
            ),
            callout(
              "info",
              "Fingerprints can be forged",
              "Mature tooling can mimic a browser fingerprint deliberately. A rare fingerprint is a strong lead; a common one is not evidence of innocence.",
            ),
            check(
              "What does a JA3 fingerprint identify?",
              [
                "The destination server",
                "The client software, from how it negotiates TLS",
                "The encryption key in use",
                "The content of the session",
              ],
              1,
              "It hashes the client's negotiation choices, which are characteristic of the implementation — so it identifies the software making the connection.",
            ),
          ],
        ),
        lesson(
          "When decryption is appropriate",
          "Legal, ethical and practical considerations.",
          8,
          [
            text(
              "TLS inspection lets you see inside traffic and carries real costs: it terminates the connection, it processes personal data, and it becomes a target holding every session in the estate.\n\nBefore deploying it, three questions need answers: is there a **lawful basis** and have staff been told; is inspection **proportionate** to the risk; and can the inspection point itself be protected, given what it now holds?",
            ),
            callout(
              "important",
              "Some traffic should never be inspected",
              "Banking, healthcare and legal categories are routinely excluded by policy and sometimes by law. An inspection deployment without an exclusion list is a data protection problem waiting to be found.",
            ),
            code(
              `Categories commonly excluded from TLS inspection

  Banking and financial services
  Healthcare and medical
  Legal and professional services
  Government services
  Personal webmail

Inspecting these is usually disproportionate and sometimes unlawful.`,
              "text",
            ),
            text(
              "The inspection point itself deserves attention. It terminates every session in the estate, which makes it among the highest-value targets you operate — and a compromise there yields plaintext for everything, including whatever you were careful to exclude.",
            ),
            check(
              "What must be established before deploying TLS inspection on employee traffic?",
              [
                "That the hardware can handle the throughput",
                "A lawful basis, proportionality, and transparency with staff",
                "That all certificates are from a public CA",
                "That the SOC has enough analysts",
              ],
              1,
              "Capacity matters operationally, but the prior questions are legal ones. Security purpose does not exempt processing from data protection obligations.",
            ),
          ],
        ),
      ],
    },
  ],
};
