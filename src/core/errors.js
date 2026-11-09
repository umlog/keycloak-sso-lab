/** 사용자에게 그대로 보여줘도 되는 메시지를 가진 오류 */
export class UserFacingError extends Error {
  constructor(userMessage, { status = 400, cause } = {}) {
    super(userMessage, { cause });
    this.userMessage = userMessage;
    this.status = status;
  }
}
