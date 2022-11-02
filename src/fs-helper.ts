import * as fs from 'node:fs';

export default class FsHelper {
  // eslint-disable-next-line no-unused-vars
  static instanceOfNodeError<T extends new (...args: any) => Error>(
    value: any,
    errorType: T,
  ): value is InstanceType<T> & NodeJS.ErrnoException {
    return value instanceof errorType;
  }

  static directoryExistsSync(path: string, required?: boolean): boolean {
    if (!path) {
      throw new Error('Arg "path" must not be empty');
    }
    try {
      const stats: fs.Stats = fs.statSync(path);
      if (stats.isDirectory()) {
        return true;
      }
      if (!required) {
        return false;
      }

      throw new Error(`Directory '${path}' does not exist`);
    } catch (error) {
      if (FsHelper.instanceOfNodeError(error, Error)) {
        if ('code' in error && error.code === 'ENOENT') {
          if (!required) {
            return false;
          }

          throw new Error(`Directory '${path}' does not exist`);
        }

        throw new Error(`Encountered an error when checking whether path '${path}' exists: ${error.message}`);
      }
    }
    return false;
  }

  static existsSync(path: string): boolean {
    if (!path) {
      throw new Error('Arg "path" must not be empty');
    }

    try {
      fs.statSync(path);
    } catch (error) {
      if (FsHelper.instanceOfNodeError(error, Error)) {
        if ('code' in error && error.code === 'ENOENT') {
          return false;
        }

        throw new Error(`Encountered an error when checking whether path '${path}' exists: ${error.message}`);
      }
    }

    return true;
  }

  static fileExistsSync(path: string): boolean {
    if (!path) {
      throw new Error('Arg "path" must not be empty');
    }

    try {
      const stats = fs.statSync(path);
      if (!stats.isDirectory()) {
        return true;
      }
    } catch (error) {
      if (FsHelper.instanceOfNodeError(error, Error)) {
        if ('code' in error && error.code === 'ENOENT') {
          return false;
        }

        throw new Error(`Encountered an error when checking whether path '${path}' exists: ${error.message}`);
      }
    }
    return false;
  }
}
