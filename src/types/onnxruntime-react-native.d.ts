declare module 'onnxruntime-react-native' {
  export class InferenceSession {
    static create(path: string, options?: any): Promise<InferenceSession>;
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
    release(): Promise<void>;
  }

  export class Tensor {
    constructor(type: string, data: Float32Array | Int32Array | BigInt64Array, dims: number[]);
    readonly data: Float32Array | Int32Array | BigInt64Array;
    readonly dims: readonly number[];
    readonly type: string;
  }
}
