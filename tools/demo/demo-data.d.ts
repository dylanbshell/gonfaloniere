// The build-time data, embedded by the shims plugin (tools/demo/shims.ts).
declare module "demo:data" {
  const data: import("./data.ts").DemoData;
  export default data;
}
