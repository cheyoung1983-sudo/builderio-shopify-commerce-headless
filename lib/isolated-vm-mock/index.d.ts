declare module 'isolated-vm' {
  export class Reference<T = any> {
    constructor(val: T);
    getSync(key: string | number): any;
    setSync(key: string | number, val: any): void;
    deleteSync(key: string | number): void;
    copySync(): T;
    derefInto(): T;
  }

  export class Context {
    global: Reference<any>;
    evalClosureSync(code: string, args?: any[]): any;
    evalSync(code: string): any;
  }

  export class Isolate {
    constructor(options?: { memoryLimit?: number });
    createContextSync(): Context;
    dispose(): void;
  }

  const ivm: {
    Isolate: typeof Isolate;
    Reference: typeof Reference;
    Context: typeof Context;
  };

  export default ivm;
}
