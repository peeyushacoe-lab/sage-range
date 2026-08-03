/**
 * Cryptography for Defenders — full lesson content.
 */

import {
  type Course, lesson, text, code, callout, check, cmd, note, out, step, terminal, walkthrough, practice,
} from "./blocks";

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

            terminal(
              "Three operations people confuse, side by side",
              "student@crypto-lab",
              [
                note("Encoding. Reversible by anyone, no key involved. It is a change of alphabet, not a security control."),
                cmd("echo -n 'transfer 50000 to acct 9912' | base64"),
                out("dHJhbnNmZXIgNTAwMDAgdG8gYWNjdCA5OTEy"),
                cmd("echo 'dHJhbnNmZXIgNTAwMDAgdG8gYWNjdCA5OTEy' | base64 -d"),
                out("transfer 50000 to acct 9912"),
                note("No key was supplied in either direction. Anything protected only by base64 is not protected."),
                note("Hashing. One-way, fixed length, and deterministic — the same input always gives the same digest."),
                cmd("echo -n 'transfer 50000 to acct 9912' | sha256sum"),
                out("6b8e15d1a3f2c0e9847bb50d21c7f4a0938e5c1642dd7fa03b9e1c8055a47f2d  -"),
                cmd("echo -n 'transfer 50001 to acct 9912' | sha256sum"),
                out("f10c4a7e92b3d5081ca6ef4471d0982b5e63a1c07f8b294de5013ab6c7f8290e  -"),
                note("One digit changed and the entire digest changed. That avalanche property is what makes a hash useful for integrity — and useless for confidentiality, since you cannot get the message back."),
                note("Encryption. Reversible, but only with the key."),
                cmd("openssl enc -aes-256-cbc -pbkdf2 -in payment.txt -out payment.enc -pass pass:correct-horse"),
                cmd("xxd payment.enc | head -2"),
                out(`00000000: 5361 6c74 6564 5f5f 91c4 0a2f 88bd 3e17  Salted__.../..>.
00000010: c209 4ab7 3f10 e582 6d41 f0a9 27cc 5b3e  ..J.?...mA..'.[>`),
                cmd("openssl enc -d -aes-256-cbc -pbkdf2 -in payment.enc -pass pass:wrong-key"),
                out("bad decrypt\n40E7A1B2:error:1C800064:Provider routines:ossl_cipher_unpadblock:bad decrypt"),
                note("Wrong key, no plaintext. Encoding gives it up to anyone, hashing gives it to no one, encryption gives it to whoever holds the key. Choosing the wrong one of the three is the most common crypto mistake in production code."),
              ],
            ),

            practice(
              "A colleague sends a file and asks you to confirm it is byte-for-byte what they sent. Write the command that produces the value you would compare.",
              ["sha256sum"],
              "sha256sum payment.txt",
              "Integrity is a hashing question, not an encoding or encryption one. base64 would only change the alphabet — anyone could alter the file and re-encode it — and encrypting proves nothing about what the plaintext was.",
              {
                forbids: ["base64", "openssl enc"],
              },
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

            terminal(
              "Why the algorithm choice decides the outcome",
              "student@crypto-lab",
              [
                note("A database of password hashes has leaked. What happens next depends entirely on how they were stored."),
                cmd("head -3 leaked_md5.txt"),
                out(`5f4dcc3b5aa765d61d8327deb882cf99
e10adc3949ba59abbe56e057f20f883e
25d55ad283aa400af464c76d713c07ad`),
                cmd("hashcat -m 0 -a 0 leaked_md5.txt rockyou.txt --quiet --status"),
                out(`Speed.#1.........: 68914.2 MH/s (58.11ms)
Recovered........: 3/3 (100.00%) Digests

5f4dcc3b5aa765d61d8327deb882cf99:password
e10adc3949ba59abbe56e057f20f883e:123456
25d55ad283aa400af464c76d713c07ad:password123`),
                note("Sixty-eight billion guesses per second. MD5 was designed to be fast, and speed is precisely the wrong property here."),
                note("Now the same passwords stored with bcrypt at cost factor 12."),
                cmd("head -1 leaked_bcrypt.txt"),
                out("$2b$12$Nt9AGb1zaTiSD8UEjyKrLuJm4ROlR1r6xtqzeCA0hZvxpDrDdU2Vy"),
                cmd("hashcat -m 3200 -a 0 leaked_bcrypt.txt rockyou.txt --quiet --status"),
                out(`Speed.#1.........: 4218 H/s (61.44ms)
Recovered........: 1/3 (33.33%) Digests
Progress.........: 14344385/14344385 (100.00%)

$2b$12$Nt9AGb1zaTiSD8UEjyKrLuJm4ROlR1r6xtqzeCA0hZvxpDrDdU2Vy:password`),
                note("Four thousand guesses per second instead of sixty-eight billion — sixteen million times slower. The whole rockyou list took hours rather than milliseconds."),
                note("Note what did not change: 'password' still fell. A slow hash buys time against weak passwords; it does not rescue them."),
                cmd("grep -c . leaked_bcrypt.txt && awk -F'$' '{print $2, $3}' leaked_bcrypt.txt | sort -u"),
                out(`3
2b 12`),
                note("The cost factor is stored in the hash itself, so you can raise it later and re-hash on next login. Designing for that from the start is the difference between a tunable system and a rewrite."),
              ],
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

            walkthrough(
              "Diagnosing a chain that will not validate",
              "A client is refusing a certificate the server team insists is valid. Both can be true — validation depends on what the client can see, not on what exists.",
              [
                step(
                  "Ask what the server actually sent",
                  "A certificate is valid in the abstract; a chain is valid as presented. Start by looking at the wire, not at the certificate file on the server.",
                  {
                    evidence: {
                      label: "openssl s_client -connect api.internal:443",
                      code: `Certificate chain
 0 s:CN = api.internal
   i:CN = Acme Issuing CA G2

Verify return code: 21 (unable to verify the first certificate)`,
                    },
                    insight: "The server sent one certificate. The chain has depth 0 — the intermediate is missing from what was presented.",
                  },
                ),
                step(
                  "Work out why it appeared to work elsewhere",
                  "Browsers often cache intermediates from previous sessions, or fetch them via the Authority Information Access extension. A command-line client with a cold cache does neither.",
                  {
                    evidence: {
                      label: "AIA extension on the leaf",
                      code: `X509v3 Authority Information Access:
    CA Issuers - URI:http://pki.acme.internal/g2.crt
    OCSP - URI:http://ocsp.acme.internal`,
                    },
                    insight: "The pointer exists, but fetching it needs network access to an internal PKI host — which this client, in a different segment, does not have.",
                  },
                ),
                step(
                  "Check the trust anchor separately from the chain",
                  "Missing intermediate and untrusted root are different failures with different fixes. Supply the intermediate manually and see what the error becomes.",
                  {
                    evidence: {
                      label: "With the intermediate supplied",
                      code: `openssl verify -untrusted g2.crt -CAfile /etc/ssl/certs/ca-certificates.crt leaf.crt

leaf.crt: CN = api.internal
error 2 at 2 depth lookup: unable to get issuer certificate`,
                    },
                    insight: "The error moved from depth 0 to depth 2. The intermediate is now fine; the private root is not in the client's trust store.",
                  },
                ),
                step(
                  "Confirm the name and validity while you are here",
                  "Two failures often hide a third. Check the subject alternative names and dates before declaring the diagnosis complete — hostname mismatch produces a similar user-visible symptom.",
                  {
                    evidence: {
                      label: "Leaf details",
                      code: `Not Before: 2026-03-01  Not After: 2027-03-01
X509v3 Subject Alternative Name:
    DNS:api.internal, DNS:api-v2.internal`,
                    },
                    insight: "Dates are fine and the name matches. Two problems, not three.",
                  },
                ),
                step(
                  "Fix both, in the right places",
                  "Configure the server to present the full chain — that is a server misconfiguration, and it will bite every cold client. Separately, distribute the internal root to the client's trust store, which is a provisioning gap. Fixing only one leaves the failure intermittent, which is far harder to diagnose next time.",
                  {
                    insight: "'It works in my browser' almost always means an intermediate was cached. Test with a cold client before believing a chain is correct.",
                  },
                ),
              ],
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
