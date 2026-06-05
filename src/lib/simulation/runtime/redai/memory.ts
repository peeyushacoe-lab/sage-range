export interface AdversaryMemory {
  actionsTaken: string[];
  failedActions: string[];
  successfulActions: string[];
  defenderResponses: string[];
}

export function createMemory(): AdversaryMemory {
  return {
    actionsTaken: [],
    failedActions: [],
    successfulActions: [],
    defenderResponses: [],
  };
}

export function recordAction(
  memory: AdversaryMemory,
  actionKey: string,
  success: boolean
): AdversaryMemory {
  return {
    ...memory,
    actionsTaken: [...memory.actionsTaken, actionKey],
    failedActions: success ? memory.failedActions : [...memory.failedActions, actionKey],
    successfulActions: success ? [...memory.successfulActions, actionKey] : memory.successfulActions,
  };
}

export function recordDefenderResponse(
  memory: AdversaryMemory,
  response: string
): AdversaryMemory {
  return {
    ...memory,
    defenderResponses: [...memory.defenderResponses.slice(-9), response],
  };
}
