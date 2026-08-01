/**
 * Network Security Fundamentals — full lesson content.
 *
 * Written to be read rather than skimmed: each lesson opens with why the topic
 * matters operationally, works through a concrete example, and closes with a
 * check that tests reasoning rather than recall.
 */

import { type Course, lesson, text, code, callout, check } from "./blocks";

export const NETWORK_SECURITY: Course = {
  slug: "network-security-fundamentals",
  modules: [
    {
      title: "Protocols worth knowing",
      description: "The handful of protocols that carry most of what you will investigate.",
      lessons: [
        lesson(
          "TCP, UDP and what a flow actually is",
          "Sessions, ports and why flow records answer most triage questions faster than packets.",
          10,
          [
            text(
              "Most network investigation does not begin with packets. It begins with **flow records** — summaries that say *this host talked to that host, on this port, for this long, moving this much data*.\n\nA flow record throws away the contents and keeps the shape of the conversation. That sounds like a loss, and for deep analysis it is. For triage it is the opposite: you can scan a day of flows in seconds, where a day of packets is hundreds of gigabytes you will never read.",
            ),
            text(
              "**TCP** is connection-oriented. A session begins with a three-way handshake (SYN, SYN-ACK, ACK), carries sequenced data, and ends with FIN or RST. Because it has a clear start and end, TCP flows have meaningful durations.\n\n**UDP** has no handshake and no session. A UDP 'flow' is an inference — a series of packets between the same endpoints, grouped by a timeout. That distinction matters when you interpret duration: a two-hour UDP flow may be one long conversation or many short ones the collector merged.",
            ),
            code(
              `Start                Src            Dst              Proto  Port  Pkts   Bytes    Dur
2026-08-02 09:14:02  10.20.4.15     142.250.187.14   TCP    443   1,204  1.8 MB   4m12s
2026-08-02 09:14:31  10.20.4.15     10.20.1.10       UDP    53    88     9.2 KB   12m40s
2026-08-02 02:11:09  10.20.4.88     185.244.25.171   TCP    8443  4,806  11.4 KB  2h41m`,
              "text",
              "Three flow records. The third is the one worth your attention.",
            ),
            text(
              "Read that third record again. Four thousand eight hundred packets over two hours and forty-one minutes, carrying eleven kilobytes in total.\n\nThat is roughly two bytes per packet of actual content. No human activity produces that shape. Something is checking in on a schedule and saying almost nothing — which is exactly what command-and-control traffic looks like.",
            ),
            callout(
              "important",
              "Volume and duration together",
              "Neither number means much alone. High volume over a short period is a download. Low volume over a long period is a beacon. It is the *relationship* between them that carries the signal.",
            ),
            check(
              "A flow shows 6,000 packets over three hours totalling 14 KB. What is the most likely explanation?",
              [
                "A large file transfer",
                "Automated check-in traffic with minimal payload",
                "A misconfigured backup job",
                "Normal web browsing",
              ],
              1,
              "Six thousand packets carrying fourteen kilobytes means almost nothing is being said, repeatedly, over a long period. That is the signature of scheduled automation — and beaconing malware is a common cause.",
            ),
          ],
        ),
        lesson(
          "DNS as an investigative goldmine",
          "Every connection starts with a name. What resolver logs give you that nothing else does.",
          10,
          [
            text(
              "Almost every outbound connection begins with a DNS lookup. That makes resolver logs unusually valuable: they record **intent** — what a host wanted to reach — even when the connection that followed was encrypted, blocked, or failed entirely.\n\nA host that resolves a known-malicious domain has told you something even if the connection never completed.",
            ),
            text(
              "DNS logs also survive when other evidence does not. Proxy logs cover only proxied traffic. Firewall logs may not record allowed connections. But the resolver sees every lookup from every host, and retention is usually generous because the records are small.",
            ),
            code(
              `timestamp             client        query                                type   rcode
2026-08-02 02:14:01   10.20.4.88    x1f4a9d2.updates-cdn.info            A      NXDOMAIN
2026-08-02 02:14:06   10.20.4.88    a7b3c0e1.updates-cdn.info            A      NXDOMAIN
2026-08-02 02:14:11   10.20.4.88    9c2e0b47.updates-cdn.info            A      NOERROR
2026-08-02 02:15:02   10.20.4.15    outlook.office365.com                A      NOERROR`,
              "text",
              "Three lookups from one host, five seconds apart, mostly failing.",
            ),
            text(
              "Those first three queries share a shape: an eight-character hexadecimal label under one parent domain, resolved seconds apart, and mostly returning **NXDOMAIN** — the name does not exist.\n\nThat is a domain generation algorithm. The malware and its operator compute the same list of candidate names; the operator registers one, and the malware finds it by trying them all. The failures are not errors — they are the mechanism working as designed.",
            ),
            callout(
              "tip",
              "NXDOMAIN rate is a cheap detection",
              "Ordinary hosts fail a small fraction of lookups. A host failing the overwhelming majority is either badly misconfigured or running something that expects to fail. Both are worth knowing about.",
            ),
            check(
              "A workstation generates 1,900 DNS queries in an hour, 99% returning NXDOMAIN, all under one parent domain. What does this most likely indicate?",
              [
                "A misconfigured DNS server",
                "A domain generation algorithm searching for its live C2 domain",
                "A user mistyping URLs repeatedly",
                "Normal certificate revocation checking",
              ],
              1,
              "The pattern — high volume, near-total failure, one parent domain, machine-generated labels — is characteristic of DGA. A misconfiguration would usually fail against many domains, not one.",
            ),
          ],
        ),
        lesson(
          "HTTP and TLS",
          "What remains visible after encryption: SNI, certificates, JA3 fingerprints, timing and volume.",
          10,
          [
            text(
              "The common assumption is that TLS ends network analysis. It does not. Encryption protects the **payload**; a considerable amount of useful metadata travels in the clear or can be inferred from the shape of the traffic.",
            ),
            text(
              "What you can still see:\n\n- **SNI** — the hostname the client asked for, sent unencrypted in the handshake on most connections\n- **Certificate details** — issuer, subject, validity, and whether it is self-signed\n- **JA3/JA4 fingerprints** — a hash of how the client negotiated, which identifies the *software* even when the destination is unremarkable\n- **Timing and volume** — packet sizes, intervals and direction",
            ),
            code(
              `Session A                          Session B
SNI:  outlook.office365.com        SNI:  (absent)
Cert: DigiCert, valid 90d          Cert: self-signed, CN=localhost
JA3:  common browser fingerprint   JA3:  rare, matches known tooling
Bytes: 3.1 MB, bursty              Bytes: 11 KB over 2h41m, regular`,
              "text",
              "Two encrypted sessions. Neither payload was read.",
            ),
            text(
              "Session B is suspicious on every metadata axis: no SNI, a self-signed certificate claiming to be localhost, an uncommon client fingerprint, and a beacon-shaped traffic profile. You have not decrypted a single byte, and you already have enough to escalate.",
            ),
            callout(
              "info",
              "Self-signed is not automatically malicious",
              "Plenty of internal services use self-signed certificates. What makes Session B notable is the *combination* — self-signed, to an external host, with no SNI, on a regular interval. Any one of those alone would be weak evidence.",
            ),
            check(
              "Which of these is NOT visible to a network analyser on a standard TLS connection?",
              [
                "The requested hostname (SNI)",
                "The server's certificate subject",
                "The contents of the HTTP request body",
                "The volume and timing of traffic",
              ],
              2,
              "The body is encrypted. SNI, certificate details and traffic shape all remain observable, which is why encrypted traffic is still analysable.",
            ),
          ],
        ),
        lesson(
          "SMB and internal movement",
          "Why lateral movement is loud on the wire even when it is quiet on the host.",
          8,
          [
            text(
              "An attacker who has one machine wants a second. On Windows estates that movement usually crosses **SMB** — file shares, administrative shares like C$ and ADMIN$, and remote service creation.\n\nThis is one of the places where the network sees what the host may not. An attacker can clear event logs on both endpoints; they cannot retroactively remove the traffic from your flow records.",
            ),
            text(
              "The useful question is rarely 'is there SMB traffic?' — there always is. It is **which pairs of hosts are talking, and is that normal for them?**\n\nA workstation connecting to a file server is unremarkable. A workstation connecting to twelve other workstations in four minutes is not. Workstations have very little legitimate reason to talk to one another.",
            ),
            code(
              `Source          Destinations (port 445)     Window
WKS-FIN-114     FS-CLIN-01                  ordinary — one file server
WKS-FIN-207     WKS-ENG-052, WKS-ENG-061,   anomalous — workstation to
                WKS-HR-018, WKS-MKT-033,    workstation, twelve in four
                ... (12 total)              minutes`,
              "text",
              "The same protocol. Very different meaning.",
            ),
            callout(
              "important",
              "East-west visibility",
              "Perimeter monitoring cannot see this at all — none of it crosses the boundary. Lateral movement happens entirely inside the network, which is why internal visibility usually finds intrusions that edge monitoring misses.",
            ),
            check(
              "Why is workstation-to-workstation SMB traffic more suspicious than workstation-to-server?",
              [
                "SMB is insecure between workstations",
                "Workstations rarely have a legitimate reason to access each other's shares",
                "Servers log SMB access but workstations do not",
                "It uses a different port",
              ],
              1,
              "The protocol is identical. What changes is the baseline: clients talk to servers by design, and to each other almost never — so that pattern stands out without needing to inspect content.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Reading a capture",
      description: "Working from statistics down to packets, rather than the other way round.",
      lessons: [
        lesson(
          "Start with conversations, not packets",
          "Finding the interesting flow among thousands before opening a single packet.",
          10,
          [
            text(
              "A three-hour capture from a busy segment can hold millions of packets. Opening it and scrolling is not analysis; it is hoping.\n\nThe working method is to **collapse first, expand last**. Start with a conversation view — one row per pair of endpoints — and sort by something meaningful. Only when you have a candidate do you look at packets.",
            ),
            text(
              "Useful sorts, roughly in order of how often they pay off:\n\n1. **Duration descending** — long-lived sessions surface beacons and tunnels\n2. **Bytes descending** — surfaces bulk transfer and exfiltration\n3. **Packets ÷ bytes** — a high ratio means many packets carrying little, which is unnatural\n4. **Destination rarity** — how many hosts have ever contacted this address",
            ),
            callout(
              "tip",
              "Rare is not the same as malicious",
              "Every environment has a long tail of unusual-but-benign traffic. Rarity narrows the search; it does not decide the verdict. Expect to discard most of what surfaces, and to learn your estate in the process.",
            ),
            check(
              "You are given a 40 GB capture and told to 'find anything bad'. What is the most productive first step?",
              [
                "Open it in a packet viewer and scroll chronologically",
                "Filter for known-malicious IP addresses",
                "Collapse to a conversation view and sort by duration and volume",
                "Extract every file transferred",
              ],
              2,
              "Conversation statistics reduce millions of packets to a screenful of candidates. Filtering on known indicators only finds what you already knew about.",
            ),
          ],
        ),
        lesson(
          "Volume, duration and direction",
          "The three numbers that separate a beacon from a backup job.",
          8,
          [
            text(
              "Three attributes describe most of what you need during triage:\n\n**Volume** — how much moved. **Duration** — over how long. **Direction** — which way, and initiated by whom.\n\nDirection matters more than people expect. A host receiving four gigabytes is downloading something. The same host *sending* four gigabytes to an unfamiliar address at 03:00 is a very different conversation.",
            ),
            code(
              `Profile                              Likely explanation
2 GB out, 4 minutes, to a CDN        software update or upload
4 GB out, 11 hours, even chunks      staged exfiltration
11 KB out, 2h41m, fixed interval     beaconing
900 MB in, 2 minutes, from a CDN     download`,
              "text",
            ),
            text(
              "The 'even chunks' detail in the second row is what separates deliberate exfiltration from an ordinary large upload. Attackers commonly split transfers to stay under volume-based alerting thresholds — and that regularity is itself the signature.",
            ),
            check(
              "A host sends 4 GB outbound over eleven hours in evenly sized chunks, overnight, to a single external IP. What is the strongest interpretation?",
              [
                "A scheduled backup to a cloud provider",
                "Staged exfiltration deliberately shaped to avoid volume thresholds",
                "A software update",
                "Normal user activity",
              ],
              1,
              "Even chunking over a long window is a deliberate shape. Legitimate backups are usually bursty and go to a known destination; the regularity plus the unfamiliar endpoint is what makes this exfiltration rather than housekeeping.",
            ),
          ],
        ),
        lesson(
          "Following a stream",
          "Reconstructing a session once you know which one matters.",
          8,
          [
            text(
              "Once conversation analysis has produced a candidate, following the stream reassembles the packets into the conversation as the two endpoints experienced it. This is where you confirm or discard the hypothesis your statistics produced.\n\nFor cleartext protocols you will see the exchange directly. For encrypted ones you will see the handshake and then ciphertext — still useful, because the handshake carries the metadata from the earlier lesson.",
            ),
            callout(
              "warning",
              "Handle recovered content carefully",
              "A reconstructed stream may contain live malware, credentials, or personal data. Extract it into an isolated environment, and treat anything you recover as evidence subject to the same handling rules as any other artefact.",
            ),
            code(
              `Reassembled HTTP session — flow 4

POST /api/v2/beacon HTTP/1.1
Host: cdn-telemetry-sync.net
Content-Length: 118

eyJpZCI6IjRhNmYtOTIxYiIsInQiOiJjaGVjay1pbiJ9

HTTP/1.1 200 OK
Content-Length: 96`,
              "text",
              "Cleartext this time. The body is Base64, not encryption.",
            ),
            text(
              "Decoding that body yields an implant identifier and a message type. Base64 is encoding, not encryption, so anyone reading the stream reads the payload.\n\nThis is where triage becomes confirmation. The statistics said *this flow behaves like a beacon*; the reassembled stream says *this flow is a beacon, and here is its identifier*.",
            ),
            check(
              "You follow a TLS stream and see only the handshake followed by ciphertext. Has the effort been wasted?",
              [
                "Yes — without decryption there is nothing to learn",
                "No — the handshake reveals SNI, certificate details and client fingerprint",
                "Yes — TLS streams cannot be reassembled",
                "No — TLS payloads can be decrypted without keys",
              ],
              1,
              "The handshake is not encrypted. SNI, certificate and JA3 details are frequently enough to identify both the destination and the client software involved.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Finding the covert channel",
      description: "Exfiltration and command and control hidden in ordinary-looking traffic.",
      lessons: [
        lesson(
          "Beacon detection",
          "Interval, jitter and payload uniformity as signal.",
          10,
          [
            text(
              "Implanted malware must ask its operator for instructions. It does this on a schedule, and that schedule is the most reliable thing about it.\n\nA **beacon** has three detectable properties: a consistent interval, low variation in that interval (**jitter**), and uniform payload sizes because the check-in message barely changes.",
            ),
            code(
              `Inter-arrival times, first twenty check-ins (seconds):

60.02  59.98  60.01  60.00  59.97  60.03  60.00  59.99
60.01  60.02  59.98  60.00  60.01  59.99  60.00  60.02
59.98  60.01  60.00  59.99

Mean payload out: 118 bytes    Mean payload in: 96 bytes`,
              "text",
              "Standard deviation under 0.02 seconds. Nothing human is this punctual.",
            ),
            text(
              "Operators know this, so modern tooling adds deliberate jitter — randomising the interval by a percentage. That degrades the signal but rarely removes it: a 20% jitter around sixty seconds still clusters far more tightly than human behaviour, and the payload uniformity usually survives untouched.",
            ),
            callout(
              "info",
              "Legitimate software beacons too",
              "Monitoring agents, update checkers and telemetry all poll on intervals. The differentiators are destination reputation, certificate quality, client fingerprint, and whether the process responsible is one you expect.",
            ),
            check(
              "An analyst dismisses a candidate beacon because its interval varies between 48 and 72 seconds. Is that reasoning sound?",
              [
                "Yes — real beacons have perfectly fixed intervals",
                "No — that is consistent with a 20% jitter setting around 60 seconds",
                "Yes — the variation proves human activity",
                "No — beacons never run faster than hourly",
              ],
              1,
              "Jitter is a standard evasion. A range of 48–72 seconds is exactly ±20% of sixty, which clusters far more tightly than genuine human traffic ever would.",
            ),
          ],
        ),
        lesson(
          "DNS tunnelling",
          "Label length, query volume and NXDOMAIN rates.",
          10,
          [
            text(
              "DNS is permitted outbound almost everywhere, because blocking it breaks everything. That makes it the most reliable covert channel available, and attackers use it both for command and control and for slow exfiltration.\n\nData is encoded into the **subdomain label** of a query. The attacker controls the authoritative nameserver for the parent domain, so every lookup delivers its payload regardless of whether the name resolves.",
            ),
            code(
              `Ordinary lookups
  www.google.com                            14 chars
  outlook.office365.com                     21 chars

Tunnelling
  4a6f696e2074686973207365637572652e corp-updates.net    51 chars
  6261736520666f722065786669.corp-updates.net           43 chars

Volume to corp-updates.net: 1,340 queries in 10 minutes
Query type: 100% TXT     Environment baseline: under 2% TXT`,
              "text",
            ),
            text(
              "Three signals appear together here: **label length** far above normal, **query volume** to a single parent domain, and a **query type distribution** that does not match the estate. TXT records carry more data than A records, so tunnelling tools favour them heavily while ordinary traffic barely uses them.",
            ),
            callout(
              "tip",
              "Baseline before you hunt",
              "Every one of these signals is relative. You cannot say a label is 'long' or TXT usage is 'high' without knowing what your own environment looks like on an ordinary day.",
            ),
            check(
              "Which combination most strongly indicates DNS tunnelling rather than unusual-but-benign traffic?",
              [
                "Occasional NXDOMAIN responses across many domains",
                "Long encoded labels, high volume to one parent domain, and disproportionate TXT queries",
                "A high number of A-record lookups to a CDN",
                "Queries to a newly registered domain",
              ],
              1,
              "It is the combination that matters. Each signal alone has innocent explanations; together they describe a channel carrying data rather than resolving names.",
            ),
          ],
        ),
        lesson(
          "Staged exfiltration",
          "Recognising deliberate chunking, and estimating volume taken.",
          10,
          [
            text(
              "Attackers who have found data still have to move it, and moving it is where they are most likely to be caught. Bulk transfer is conspicuous, so they stage it: split the data, move it slowly, and prefer hours when nobody is watching.\n\nYour job during an incident is usually not just to detect this but to **quantify** it — how much left, over what period. That figure determines notification obligations, so it needs to be defensible.",
            ),
            code(
              `Destination        Sessions  Bytes out    Window            Chunk size
185.244.25.171     412       184,220,000  23:00–10:00       ~447 KB, even
update.microsoft   88        1,204,000    business hours    variable`,
              "text",
              "Consistent chunk size across hundreds of sessions is not how ordinary software behaves.",
            ),
            callout(
              "warning",
              "State what the evidence supports",
              "Flow records show volume, not content. You can say 184 MB left to this host in this window. You cannot say which files those were unless other evidence establishes it — and the difference matters enormously in a notification.",
            ),
            check(
              "Flow data shows 184 MB sent to an external host over eleven hours. What can you legitimately conclude?",
              [
                "184 MB of customer records were stolen",
                "184 MB left the estate to that destination in that window",
                "Nothing, without packet capture",
                "The data was encrypted before leaving",
              ],
              1,
              "Flow records establish volume, destination and timing — nothing about content. Overstating this in a report is a common and costly error, because the claim will be tested later.",
            ),
          ],
        ),
      ],
    },
  ],
};
