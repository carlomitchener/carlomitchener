export class MrlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MrlyError";
  }
}
