import { MESSAGES } from '@/lib/messages';

/** An expected business-rule failure whose message is safe to show the user. */
export class DomainError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(userMessage: string = MESSAGES.COMMON.NOT_FOUND) {
    super(userMessage);
  }
}

export class ConflictError extends DomainError {}

export class RuleViolationError extends DomainError {}

export class ForbiddenError extends DomainError {
  constructor() {
    super(MESSAGES.COMMON.FORBIDDEN);
  }
}

export class UnauthenticatedError extends DomainError {
  constructor() {
    super(MESSAGES.COMMON.UNAUTHENTICATED);
  }
}

export class MissingExchangeRateError extends DomainError {
  constructor() {
    super(MESSAGES.EXPENSE.RATE_MISSING);
  }
}
