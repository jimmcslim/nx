import { existsSync, rmSync, watch, writeFileSync } from 'fs';

export class FileLock {
  locked: boolean;

  private lockFilePath: string;
  lockPromise: Promise<void>;

  constructor(private file: string) {
    this.lockFilePath = `${file}.lock`;
    this.locked = existsSync(this.lockFilePath);
  }

  lock() {
    if (this.locked) {
      throw new Error(`File ${this.lockFilePath} is already locked`);
    }
    this.locked = true;
    writeFileSync(this.file, '');
  }

  unlock() {
    if (!this.locked) {
      throw new Error(`File ${this.lockFilePath} is not locked`);
    }
    this.locked = false;
    rmSync(this.file);
  }

  wait(timeout?: number) {
    return new Promise<void>((res, rej) => {
      try {
        let watcher = watch(this.lockFilePath);

        watcher.on('change', (eventType) => {
          if (eventType === 'delete') {
            this.locked = false;
            res();
            watcher.close();
          }
        });
      } catch {
        // File watching is not supported
        let start = Date.now();
        setInterval(() => {
          if (!this.locked || !existsSync(this.file)) {
            res();
          }

          const elapsed = Date.now() - start;
          if (timeout && elapsed > timeout) {
            rej(
              new Error(`Timeout waiting for file lock ${this.lockFilePath}`)
            );
          }
        }, 2);
      }
    });
  }
}
