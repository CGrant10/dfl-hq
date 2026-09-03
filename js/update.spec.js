import { describe, expect, it } from "vitest";
import { dismissedUpdate, dismissUpdate, isNewer } from "./update.js";

function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}

describe("app updates",()=>{
  it("compares multi-part release versions",()=>{
    expect(isNewer("1.236.2","1.218.0")).toBe(true);
    expect(isNewer("1.236.2","1.236.2")).toBe(false);
  });

  it("keeps a dismissed release hidden without hiding the next release",()=>{
    const storage=memoryStorage();
    dismissUpdate("1.236.2",storage);
    expect(dismissedUpdate("1.236.2",storage)).toBe(true);
    expect(dismissedUpdate("1.237.0",storage)).toBe(false);
  });
});
