export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * An error whose message is deliberately safe to show to the end user.
 *
 * Throw this for domain outcomes the user is expected to act on ("Alt text is
 * required before publishing"). `actionError` passes the message through
 * verbatim, so never construct it from a Flux response, an upstream body, or
 * any other untrusted string.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
