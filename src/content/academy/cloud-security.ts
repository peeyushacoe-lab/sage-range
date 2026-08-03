/**
 * Cloud Security Essentials — full lesson content.
 */

import {
  type Course, lesson, text, code, callout, check, cmd, diagram, note, out, stage, step, terminal, walkthrough, practice,
} from "./blocks";

export const CLOUD_SECURITY: Course = {
  slug: "cloud-security-essentials",
  modules: [
    {
      title: "Identity is the perimeter",
      description: "Roles, policies and the transitive access nobody intended to grant.",
      lessons: [
        lesson(
          "Users, roles and assumption",
          "How a low-privilege identity becomes an administrative one through a chain nobody designed.",
          10,
          [
            text(
              "On-premises, an attacker who reaches a network still has to move through it. In cloud there is often no network to cross: a credential *is* the access. Everything is an API call, and the API does not care where you are calling from.\n\nThis changes what 'privilege' means. The question is never 'what does this role allow?' — it is **'what can this role eventually reach?'**",
            ),
            text(
              "Role assumption is the mechanism. An identity permitted to assume another role gains that role's permissions. If the second role can assume a third, the chain continues. Each grant may be individually reasonable while the composition is not.",
            ),
            code(
              `ci-deploy            can assume →  ecs-task-role
ecs-task-role        can assume →  data-migration-role
data-migration-role  has        →  AdministratorAccess

Effective privilege of ci-deploy: administrator.
Nobody granted that. It emerged.`,
              "text",
              "Three deliberate decisions producing one unintended outcome.",
            ),
            callout(
              "important",
              "Audit the closure, not the grant",
              "Reviewing each policy in isolation will never surface this. The question that finds it is 'what is the transitive closure of what this identity can reach?' — which needs tooling, not reading.",
            ),
            check(
              "A service account has only s3:GetObject and sts:AssumeRole on one role. Why might that still be dangerous?",
              [
                "GetObject allows writing to buckets",
                "The assumable role may itself assume others, extending reach far beyond the original grant",
                "AssumeRole always grants administrator",
                "It is not dangerous — the permissions are minimal",
              ],
              1,
              "The danger is compositional. Two narrow permissions become broad when the second one leads somewhere that leads somewhere else.",
            ),
          ],
        ),
        lesson(
          "Permissions boundaries and scoping",
          "Constraining what a stolen credential can reach.",
          8,
          [
            text(
              "Least privilege is easy to state and hard to hold. Two mechanisms do most of the practical work: **resource scoping** and **permissions boundaries**.\n\nScoping means naming the resources rather than using a wildcard. A role that can read one bucket is a much smaller problem than one that can read every bucket, and the difference is a single line of policy.",
            ),
            code(
              `Weak — every bucket in the account
  "Action": "s3:GetObject",
  "Resource": "*"

Scoped — one prefix in one bucket
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::reports-prod/monthly/*"`,
              "text",
            ),
            text(
              "A **permissions boundary** is different in kind: it is a ceiling. It does not grant anything; it caps what any policy attached to that identity can ever grant. That makes it useful where teams need to create their own roles — they can grant themselves whatever they like, up to the boundary, and no further.",
            ),
            callout(
              "tip",
              "Wildcards are a decision, not a default",
              "Most wildcards in production were written during a deadline and never revisited. A quarterly search for `\"Resource\": \"*\"` finds more real risk than most vulnerability scans.",
            ),
            check(
              "What does a permissions boundary do?",
              [
                "Grants a fixed set of permissions to an identity",
                "Caps the maximum permissions any policy on that identity can confer",
                "Blocks access from outside a network range",
                "Encrypts credentials at rest",
              ],
              1,
              "A boundary grants nothing. It defines a ceiling, which is what makes delegated role creation safe.",
            ),
          ],
        ),
        lesson(
          "Instance and workload identity",
          "Why metadata services are a favourite target, and what IMDSv2 changes.",
          8,
          [
            text(
              "Workloads need credentials, and hard-coding them is worse than the alternative. So cloud providers expose an **instance metadata service** — a link-local address a workload can query to receive temporary credentials for its assigned role.\n\nThat is a sound design with one sharp edge: anything that can make an HTTP request from the instance can ask for those credentials. Including a server-side request forgery vulnerability in your application.",
            ),
            code(
              `SSRF payload:
  http://169.254.169.254/latest/meta-data/iam/security-credentials/

Response (IMDSv1):
  {
    "AccessKeyId":     "ASIA...",
    "SecretAccessKey": "...",
    "Token":           "...",
    "Expiration":      "2026-08-02T18:00:00Z"
  }`,
              "text",
              "A web vulnerability becomes a cloud credential.",
            ),
            text(
              "**IMDSv2** requires a session token obtained by a PUT request with a specific header, and limits the response hop count. Most SSRF primitives can only issue simple GETs and cannot set headers, so this closes the common path without changing application code.",
            ),
            callout(
              "danger",
              "SSRF is a cloud-critical bug",
              "The same flaw that is medium severity on-premises is frequently critical in cloud, because the metadata endpoint turns it directly into credential theft. Severity depends on where the code runs.",
            ),
            check(
              "Why does enforcing IMDSv2 mitigate credential theft via SSRF?",
              [
                "It encrypts the credentials in transit",
                "It requires a PUT with a header and limits hops, which typical SSRF cannot satisfy",
                "It disables the metadata service entirely",
                "It rotates credentials every minute",
              ],
              1,
              "The protection is procedural rather than cryptographic: the request shape required by IMDSv2 is one that most SSRF primitives cannot produce.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Audit trails",
      description: "What is recorded, where, and what an attacker does about it.",
      lessons: [
        lesson(
          "Anatomy of an audit event",
          "Reading who did what, from where, with which identity.",
          8,
          [
            text(
              "A cloud audit event answers four questions: **who** (the identity), **what** (the API call), **where from** (source address), and **when**. Learning to read them fluently is most of cloud incident response, because in cloud almost every action is an API call and therefore leaves one.",
            ),
            code(
              `eventTime      2026-07-14T02:41:09Z
eventName      CreateUser
sourceIP       185.244.25.171
userIdentity   AKIA2ZQ7EXAMPLE41  (ci-deploy)
requestParams  { "userName": "svc-monitoring" }

eventTime      2026-07-14T02:41:31Z
eventName      AttachUserPolicy
requestParams  { "policyArn": ".../AdministratorAccess" }`,
              "text",
              "Two events, thirty seconds apart, that together mean persistence.",
            ),
            text(
              "Read alone, `CreateUser` is administrative housekeeping. Followed by `AttachUserPolicy` granting administrator, and then `CreateAccessKey`, it is an attacker ensuring that revoking the credential they arrived on will not remove them.\n\nSequences carry meaning that individual events do not.",
            ),

            terminal(
              "Reading CloudTrail without a SIEM",
              "analyst@ir-box",
              [
                note("You have a day of CloudTrail JSON and an access key you believe was stolen. Start with what that key did."),
                cmd("jq -r 'select(.userIdentity.accessKeyId==\"AKIA4XMPL3EXAMPLE\") | .eventName' trail.json | sort | uniq -c | sort -rn"),
                out(`     42 GetCallerIdentity
     18 ListBuckets
     11 DescribeInstances
      6 ListUsers
      3 CreateAccessKey
      1 AttachUserPolicy`),
                note("GetCallerIdentity forty-two times is orientation — whoever holds the key does not know what it is. The last two lines are the problem."),
                cmd("jq -r 'select(.eventName==\"CreateAccessKey\") | [.eventTime, .userIdentity.arn, .requestParameters.userName] | @tsv' trail.json"),
                out(`2026-07-31T02:41:07Z  arn:aws:iam::4021:user/ci-deploy  ci-deploy
2026-07-31T02:41:34Z  arn:aws:iam::4021:user/ci-deploy  svc-backup
2026-07-31T02:42:02Z  arn:aws:iam::4021:user/ci-deploy  svc-backup`),
                note("The compromised identity minted a key for itself, then two for a different user. That second user is now the persistence."),
                cmd("jq -r 'select(.eventName==\"AttachUserPolicy\") | [.eventTime, .requestParameters.userName, .requestParameters.policyArn] | @tsv' trail.json"),
                out(`2026-07-31T02:42:19Z  svc-backup  arn:aws:iam::aws:policy/AdministratorAccess`),
                note("Twelve minutes from first API call to full administrator. Now find every source address involved."),
                cmd("jq -r 'select(.userIdentity.accessKeyId==\"AKIA4XMPL3EXAMPLE\") | .sourceIPAddress' trail.json | sort -u"),
                out(`185.244.25.171
203.0.113.44`),
                note("Two addresses, neither in your VPC ranges. Revoke svc-backup's keys first — that is the access that survives rotating the original."),
              ],
            ),

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
            ),
            check(
              "A leaked access key is revoked immediately after CreateUser, AttachUserPolicy and CreateAccessKey are observed. Is the incident contained?",
              [
                "Yes — the compromised credential no longer works",
                "No — the attacker created a separate identity with its own key",
                "Yes, provided the source IP is blocked",
                "Cannot be determined from audit logs",
              ],
              1,
              "That three-call sequence exists precisely to survive revocation. Containment means removing the new identity too.",
            ),
          ],
        ),
        lesson(
          "Regional gaps and disabled trails",
          "Why unused regions are a staging ground.",
          10,
          [
            text(
              "Audit logging is usually configured per region, and organisations configure it where they operate. Attackers know this, and deliberately work in regions you have never deployed to — where there is nothing to switch off, because nothing was ever turned on.",
            ),
            code(
              `03:02:44  StopLogging   trailName: org-audit-trail (eu-west-2)
03:05:10  RunInstances  region: ap-south-1  count: 20  type: g5.xlarge

No trail configured in ap-south-1.`,
              "text",
            ),
            text(
              "Two techniques appear here. `StopLogging` is noisy — it generates an event, and a well-configured estate alerts on it immediately. Operating in an unmonitored region is quieter, because the absence of logs is not itself an event.\n\nThe practical defence is an organisation-wide trail covering **all** regions including those you do not use, plus a control that prevents workloads being created in them at all.",
            ),
            callout(
              "important",
              "Absence of evidence, again",
              "During an incident, 'we found nothing in that region' means nothing if you were not collecting there. Establish coverage before you draw conclusions about scope.",
            ),
            check(
              "Why do attackers favour regions an organisation does not use?",
              [
                "Those regions have weaker security controls",
                "Audit logging is often not configured there, so activity is unrecorded",
                "Instances are cheaper there",
                "Network latency makes detection slower",
              ],
              1,
              "The regions are technically identical. What differs is your visibility — and unmonitored is better for the attacker than monitored-then-disabled, which generates an alert.",
            ),
          ],
        ),
        lesson(
          "Detecting cloud persistence",
          "New identities, altered trust policies and fresh access keys.",
          8,
          [
            text(
              "Cloud persistence rarely looks like malware. It looks like administration: a new user, a new key, a modified trust relationship. All of these are things a legitimate engineer might do on an ordinary Tuesday.\n\nDetection therefore depends on **who** did it and **whether it fits the pattern of that identity**, not on the action being unusual in itself.",
            ),
            text(
              "The highest-value events to watch:\n\n- `CreateUser` and `CreateAccessKey`, especially outside change windows\n- `UpdateAssumeRolePolicy` adding an external account as a trusted principal\n- `CreateSAMLProvider` or identity-provider changes\n- Long-lived keys created for an identity that previously used only temporary credentials",
            ),
            callout(
              "warning",
              "Trust policy changes are quiet and severe",
              "Adding an external account to a role's trust policy grants standing access without creating any credential in your account. It is easy to miss in a review and survives every key rotation you perform.",
            ),

            diagram(
              "One leaked key to durable access",
              "Every stage after the first exists to survive the remediation you are about to perform. Read it as a list of things to check before you declare the incident closed.",
              [
                stage("Credential exposure", "T1552.001", "A long-lived access key reaches somewhere it should not — a public repository, a build log, a laptop. No API call has happened yet, and this is the last moment prevention is cheap."),
                stage("Orientation", "T1580", "GetCallerIdentity, ListBuckets, DescribeInstances. The operator does not know what the key can do, so they ask. A burst of read-only enumeration from a new address is the earliest detectable moment."),
                stage("Second identity", "T1136.003", "A new IAM user or access key is created. This is the pivot that matters: rotating the original key now achieves nothing, because the access no longer depends on it."),
                stage("Privilege escalation", "T1098.001", "A managed policy — usually AdministratorAccess, because it is the one that always exists — is attached to the new identity."),
                stage("Trail tampering", "T1562.008", "Logging is stopped, deleted, or pointed at a bucket the operator controls. StopLogging and DeleteTrail should page someone at any hour; they have no legitimate emergency use."),
                stage("Resource abuse or exfiltration", "T1496", "Compute is spun up for mining, or storage is read out. This is the stage the finance team notices, days later, which is far too late to be your detection."),
              ],
            ),
            check(
              "Which cloud persistence technique survives a full rotation of all your access keys?",
              [
                "A new IAM user with its own access key",
                "A trust policy modified to allow an external account to assume a role",
                "A hard-coded credential in application source",
                "An EC2 instance profile",
              ],
              1,
              "The external account authenticates with its own credentials, which you do not control and cannot rotate. Rotating your keys changes nothing for them.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Storage and data exposure",
      description: "The misconfiguration that keeps appearing in breach reports.",
      lessons: [
        lesson(
          "Public by accident",
          "How exposure happens, and how to prove whether anyone found it.",
          8,
          [
            text(
              "Object storage exposure remains one of the most common causes of large breaches, and it is almost never the result of a sophisticated attack. It is the result of a bucket policy written to unblock a deadline.\n\nThe usual paths: a wildcard principal, an overly broad ACL inherited by new objects, or a policy that grants access based on a condition that turns out not to constrain anything.",
            ),
            code(
              `Dangerous — anyone, conditioned on a header the caller controls
  "Principal": "*",
  "Action": "s3:GetObject",
  "Condition": { "StringEquals": { "aws:Referer": "internal-tool" } }`,
              "text",
              "A Referer header is set by the client. This condition constrains nobody.",
            ),
            text(
              "When exposure is found, the immediate instinct is to close it. Do that — but **preserve the access logs first**. Whether anyone else found the data before you did is the question that determines your notification obligations, and closing the bucket does not erase the logs but reconfiguring it hastily sometimes does.",
            ),
            callout(
              "tip",
              "Answer the question the regulator will ask",
              "'Was it accessed?' is answerable only if access logging was on. If it was not, say so plainly rather than implying absence of access — those are very different statements.",
            ),

            walkthrough(
              "Working out whether the exposure was actually read",
              "A bucket holding customer exports has been world-readable for eleven days. The disclosure question is not whether it was public — it is whether anyone took anything.",
              [
                step(
                  "Establish exactly when it became public",
                  "The policy change is in the management trail. Get the precise timestamp before anything else, because it bounds every question that follows.",
                  {
                    evidence: {
                      label: "CloudTrail — management events",
                      code: `2026-07-20T14:22:51Z  PutBucketPolicy
  bucket: acme-customer-exports
  principal: arn:aws:iam::4021:user/data-eng-intern
  policy: Principal "*", Action s3:GetObject`,
                    },
                    insight: "Eleven days of exposure, and an identifiable human who did it. Resist the urge to focus on the human — the exposure window is the finding.",
                  },
                ),
                step(
                  "Check whether data-plane logging was even on",
                  "This is where most of these investigations end badly. Management events are on by default; object-level reads are not. If S3 access logging was off, you cannot prove absence of access.",
                  {
                    evidence: {
                      label: "Bucket configuration",
                      code: `ServerAccessLogging: Enabled -> s3://acme-logs/exports/
ObjectLevelLogging (CloudTrail data events): Disabled`,
                    },
                    insight: "Server access logs are enabled. That is a lucky break — without them the honest answer to the disclosure question would be 'we do not know'.",
                  },
                ),
                step(
                  "Separate your own traffic from everyone else's",
                  "The vast majority of requests will be your own application. Filter to unauthenticated requests, since a public read needs no credentials.",
                  {
                    evidence: {
                      label: "Access log — anonymous GETs in the window",
                      code: `requester: - (anonymous)
2026-07-24T03:11:02Z GET /exports/2026-q2-customers.csv  200  41822190
2026-07-24T03:11:44Z GET /exports/2026-q1-customers.csv  200  38911204
2026-07-29T18:02:19Z GET /                               403  -`,
                    },
                    insight: "Two successful anonymous reads of full customer exports, forty megabytes each. The 403 is a scanner that found nothing.",
                  },
                ),
                step(
                  "Attribute the reads as far as you honestly can",
                  "Source addresses give you geography and hosting provider, not identity. Say what the evidence supports and no more — a disclosure that overstates certainty is worse than one that admits a gap.",
                  {
                    evidence: {
                      label: "Source analysis",
                      code: `45.9.148.99   hosting provider, no PTR, seen scanning /24 broadly
45.9.148.99   both requests, 42 seconds apart, curl/7.81.0 user agent`,
                    },
                    insight: "One source, automated client, two targeted requests. It knew the object names — which means it had already listed the bucket.",
                  },
                ),
                step(
                  "State the finding in terms the business can act on",
                  "Two customer export files containing personal data were downloaded by an unidentified party on 24 July. The bucket was public from 20 to 31 July. Object-level logging was disabled, so reads before server access logging rotated cannot be ruled out. That last sentence is the one people want to delete, and the one that must stay.",
                  {
                    insight: "Notification obligations turn on 'was personal data accessed', not 'was it exposed'. You now have a defensible answer to both.",
                  },
                ),
              ],
            ),

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
            ),
            check(
              "You discover a publicly readable bucket of customer documents. What is the correct first action?",
              [
                "Delete the bucket to eliminate the exposure",
                "Preserve access logs, then restrict access",
                "Restrict access and move on",
                "Rotate all account credentials",
              ],
              1,
              "The logs determine whether this is an exposure or a breach. Closing without preserving them destroys the only evidence that answers the question you will be asked.",
            ),
          ],
        ),
        lesson(
          "Encryption and key management",
          "What encryption at rest does and does not protect you from.",
          8,
          [
            text(
              "Encryption at rest is frequently cited as a mitigating control after a cloud breach. Usually it is not one.\n\nProvider-managed encryption protects against one specific threat: someone obtaining the physical media. It does nothing against an attacker using valid API credentials, because the service decrypts transparently for any authorised caller — and the attacker is, as far as the service is concerned, authorised.",
            ),
            callout(
              "important",
              "Encryption at rest and stolen credentials",
              "If data was read through the API with valid credentials, encryption at rest was never engaged as a defence. Claiming it as mitigation in a breach report is a mistake that will be picked apart.",
            ),
            text(
              "Customer-managed keys change this somewhat, because access to the key becomes a separate authorisation you can revoke and audit independently. That is a real control — but only if the compromised identity does not also have permission to use the key, which in practice it often does.",
            ),
            check(
              "An attacker reads objects from an encrypted bucket using stolen credentials. Did encryption at rest reduce the impact?",
              [
                "Yes — the data they obtained is encrypted",
                "No — the service decrypts transparently for any authorised caller",
                "Yes — they would need the key separately",
                "Only if the bucket used customer-managed keys",
              ],
              1,
              "The API returns plaintext to authorised callers. Encryption at rest addresses physical media theft, not credential compromise.",
            ),
          ],
        ),
        lesson(
          "Responding to a researcher disclosure",
          "Handling a report well, and the clock it starts.",
          8,
          [
            text(
              "Someone outside your organisation has found the exposure and told you. How you respond over the next few hours affects both the technical outcome and whether they publish before you are ready.\n\nAcknowledge quickly, thank them genuinely, and give a realistic timeline. Researchers who feel dismissed publish sooner; researchers who feel heard almost always hold.",
            ),
            text(
              "In parallel, the disclosure has started clocks. Awareness of a likely personal data breach begins the regulatory notification period regardless of how you learned of it — a researcher email counts as awareness just as an alert does.",
            ),
            callout(
              "danger",
              "Never threaten a reporter",
              "Legal threats against good-faith researchers reliably turn a contained incident into a public one, and the story becomes your response rather than the exposure.",
            ),
            check(
              "A researcher reports an exposed bucket and offers 30 days before publishing. When does your regulatory notification clock start?",
              [
                "After the 30-day disclosure window",
                "On becoming aware of the likely breach — the researcher's email",
                "When you confirm the full scope of affected records",
                "When the researcher publishes",
              ],
              1,
              "Awareness starts the clock, and how you became aware is irrelevant. The researcher's timeline is a courtesy and has no bearing on the regulatory one.",
            ),
          ],
        ),
      ],
    },
  ],
};
