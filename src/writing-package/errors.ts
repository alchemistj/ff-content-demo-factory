export class WritingPackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WritingPackageError";
  }
}
