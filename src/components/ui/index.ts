// Range UI kit — one shared design language. Import from "@/components/ui".
//
// Colour rule: `accent` is interactive, `ok` is success, `sev-*` is severity.
// Status (<Badge>) and severity (<Severity>) are separate on purpose — see the
// note at the top of severity.tsx.
export { Card, CardHeader, CardTitle, CardContent } from "./card";
export { Button, buttonVariants } from "./button";
export { Badge } from "./badge";
export { Severity, SeverityDot, toSeverity, SEVERITIES, type SeverityLevel } from "./severity";
export { ProgressBar } from "./progress";
export { PageHeader } from "./page-header";
export { EmptyState } from "./empty-state";
export { StatCard } from "./stat-card";
export { Field } from "./input";
export { Table, TableScroll, THead, TBody, TR, TH, TD } from "./table";
