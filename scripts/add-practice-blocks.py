"""
Insert construct-the-answer practice exercises into existing Academy lessons.

Placed immediately before each lesson's closing knowledge check, so the shape
becomes read -> watch -> try -> check. Run once; re-running skips lessons that
already carry a practice block.

Usage: python scripts/add-practice-blocks.py
"""

import io
import os
import re
import sys

ROOT = os.path.join("src", "content", "academy")

BLOCKS = {}


def add(course, lesson_title, source):
    BLOCKS.setdefault(course, {})[lesson_title] = source.rstrip() + "\n"


add("network-security", "DNS as an investigative goldmine", '''
            practice(
              "Using the log format below, write a one-liner that prints every query name with the number of times it was requested, most frequent first.",
              ["awk", "uniq -c", "sort -rn"],
              "awk '{print $3}' dns.log | sort | uniq -c | sort -rn",
              "Extract the field, sort so identical names are adjacent, count the runs with uniq -c, then sort numerically in reverse. uniq only collapses adjacent lines, which is why the first sort is not optional.",
              {
                setup: {
                  label: "dns.log — space separated",
                  code: `timestamp             client        query                         type  rcode
2026-08-02T02:14:01Z  10.20.4.88    x1f4a9d2.updates-cdn.info     A     NXDOMAIN
2026-08-02T02:14:06Z  10.20.4.88    a7b3c0e1.updates-cdn.info     A     NXDOMAIN
2026-08-02T02:15:02Z  10.20.4.15    outlook.office365.com         A     NOERROR`,
                },
                forbids: ["grep -c"],
              },
            ),''')

add("network-security", "DNS tunnelling", '''
            practice(
              "Write a one-liner that prints only the queries whose name is longer than 50 characters — the length that separates ordinary hostnames from encoded payloads.",
              ["awk", "length"],
              "awk 'length($3) > 50 {print $3}' dns.log",
              "awk's length() applied to the query field filters on the property that matters. Tunnelling has to encode data into the name itself, so the name grows well beyond what real hostnames need.",
              {
                setup: {
                  label: "dns.log — query is field 3",
                  code: `2026-08-02T02:14:01Z  10.20.4.88  aGVsbG8gd29ybGQgdGhpcyBpcyBhIHZlcnkgbG9uZyBlbmNvZGVkIHBheWxvYWQ.t.evil.io
2026-08-02T02:14:03Z  10.20.4.15  outlook.office365.com`,
                },
              },
            ),''')

add("network-security", "Volume, duration and direction", '''
            practice(
              "Write a one-liner that prints only the hosts sending out more bytes than they received — the direction asymmetry that matters for exfiltration.",
              ["awk", "$3", "$2"],
              "awk '$3 > $2 {print $1, $2, $3}' flows.txt",
              "The comparison is the whole detection. Total volume tells you little on its own; a workstation that uploads more than it downloads is behaving unlike a workstation.",
              {
                setup: {
                  label: "flows.txt — host, bytes_in, bytes_out",
                  code: `10.20.4.15   842011920   19402011
10.20.4.88     4021884  11844029301
10.20.9.31    92011002    1840221`,
                },
              },
            ),''')

add("cloud-security", "Anatomy of an audit event", '''
            practice(
              "Write a jq command that prints the time and target user name of every CreateAccessKey event in trail.json.",
              ["jq", "eventName", "CreateAccessKey", "eventTime"],
              `jq -r 'select(.eventName=="CreateAccessKey") | [.eventTime, .requestParameters.userName] | @tsv' trail.json`,
              "select() filters the event stream by name, then the array and @tsv turn the fields you want into a readable column. CreateAccessKey is the event that makes an intrusion survive rotating the original credential, so it is worth being able to pull on demand.",
              {
                setup: {
                  label: "trail.json — one event per line",
                  code: `{"eventTime":"2026-07-31T02:41:07Z","eventName":"CreateAccessKey",
 "userIdentity":{"arn":"arn:aws:iam::4021:user/ci-deploy"},
 "requestParameters":{"userName":"svc-backup"}}`,
                },
              },
            ),''')

add("cloud-security", "Public by accident", '''
            practice(
              "Write a one-liner that returns only the successful anonymous reads from the access log — the requests that bear on whether data actually left.",
              ["grep", "200"],
              `grep '^-' access.log | grep ' 200 '`,
              "Anonymous requests carry '-' as the requester, and only a 200 means the object was served. Authenticated requests are your own application and answer a different question entirely.",
              {
                setup: {
                  label: "access.log — requester, time, method, path, status, bytes",
                  code: `-        2026-07-24T03:11:02Z GET /exports/2026-q2-customers.csv 200 41822190
-        2026-07-29T18:02:19Z GET /                               403 -
AIDA991  2026-07-24T09:00:11Z GET /exports/2026-q2-customers.csv 200 41822190`,
                },
              },
            ),''')

add("forensics", "Imaging and hashing", '''
            practice(
              "You have just acquired sdb.raw and recorded the acquisition hash. Write the command that independently verifies the image file on disk still matches it.",
              ["sha256sum"],
              "sha256sum /evi/case-2026-114/sdb.raw",
              "The point is a second, independent computation — the acquisition tool hashed what it read from the wire, and this hashes what landed on disk. Two code paths agreeing is what makes the image defensible.",
              {
                forbids: ["md5sum"],
              },
            ),''')

add("forensics", "Log deletion and gaps", '''
            practice(
              "Write the PowerShell command that returns every Security log entry recording that the log itself was cleared.",
              ["Get-WinEvent", "1102"],
              "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102}",
              "Clearing the Security log writes event 1102 before the clear takes effect, so the destruction records itself. The absence of everything else is the finding, and 1102 is what proves the absence was deliberate.",
              {
                forbids: ["4624"],
              },
            ),''')

add("detection-engineering", "Detection logic and conditions", '''
            practice(
              "Complete the condition line so the rule fires on the selection but never on the known-good activity captured by the filter.",
              ["selection", "not", "filter"],
              "condition: selection and not filter",
              "Sigma conditions read as plain logic, and this is the shape almost every tuned rule ends up with: match the behaviour, then subtract the specific legitimate case. Writing the exclusion as its own named block keeps the detection readable when someone revisits it a year later.",
              {
                setup: {
                  label: "rule fragment",
                  code: `detection:
  selection:
    ParentImage|endswith: '\\\\EXCEL.EXE'
    Image|endswith: '\\\\powershell.exe'
  filter:
    CommandLine|contains: 'C:\\\\FinOps\\\\refresh-rates.ps1'
  condition: ???`,
                },
              },
            ),''')

add("cryptography", "Encoding, hashing, encryption", '''
            practice(
              "A colleague sends a file and asks you to confirm it is byte-for-byte what they sent. Write the command that produces the value you would compare.",
              ["sha256sum"],
              "sha256sum payment.txt",
              "Integrity is a hashing question, not an encoding or encryption one. base64 would only change the alphabet — anyone could alter the file and re-encode it — and encrypting proves nothing about what the plaintext was.",
              {
                forbids: ["base64", "openssl enc"],
              },
            ),''')

add("threat-intelligence", "Indicators and their lifespan", '''
            practice(
              "Write a one-liner that keeps only the indicators first seen on or after 1 January 2026, discarding the rest of the feed.",
              ["awk", "2026-01-01"],
              `awk -F, '$2 >= "2026-01-01"' feed_ips.txt`,
              "ISO dates compare correctly as strings, so no parsing is needed. Expiring by age is the practical answer to indicator decay — old addresses get reassigned, and blocking a reassigned address damages your own operations.",
              {
                setup: {
                  label: "feed_ips.txt — address, first_seen, category",
                  code: `185.244.25.171,2024-11-02,c2
91.203.44.18,2026-01-17,c2
45.9.148.99,2023-06-30,scanner`,
                },
              },
            ),''')


# ── Insertion ──────────────────────────────────────────────────────────────


def ensure_import(source):
    match = re.search(r'import \{([^}]*)\} from "\./blocks";', source, re.S)
    if not match:
        raise SystemExit("could not find the blocks import")

    names = [n.strip() for n in match.group(1).split(",") if n.strip()]
    if "practice" in names:
        return source

    names.append("practice")
    joined = ", ".join(names)
    replacement = 'import {\n  ' + joined + ',\n} from "./blocks";'
    return source[: match.start()] + replacement + source[match.end():]


def insert_block(source, lesson_title, block_src):
    title_line = '          "%s",' % lesson_title
    at = source.find(title_line)
    if at == -1:
        return source, "lesson title not found"

    check_at = source.find("\n            check(", at)
    if check_at == -1:
        return source, "no closing check() found"

    if "\n            practice(" in source[at:check_at]:
        return source, "already present"

    return source[: check_at + 1] + block_src + source[check_at + 1:], None


def main():
    total = 0
    for course, lessons in BLOCKS.items():
        path = os.path.join(ROOT, course + ".ts")
        with io.open(path, encoding="utf-8") as fh:
            source = fh.read()

        inserted = False
        for lesson_title, block_src in lessons.items():
            source, err = insert_block(source, lesson_title, block_src)
            if err:
                print("  SKIP %-24s %s — %s" % (course, lesson_title, err))
                continue
            print("  ok   %-24s %s" % (course, lesson_title))
            inserted = True
            total += 1

        if inserted:
            source = ensure_import(source)

        with io.open(path, "w", encoding="utf-8") as fh:
            fh.write(source)

    print("\n%d practice block(s) inserted" % total)
    return 0


if __name__ == "__main__":
    sys.exit(main())
