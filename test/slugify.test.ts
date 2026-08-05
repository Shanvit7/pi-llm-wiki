import { describe, expect, it } from "vitest";
import { slugify } from "../extensions/llm-wiki/lib/utils.js";

describe("slugify", () => {
  it("should keep Unicode letters and numbers", () => {
    expect(slugify("中文标题")).toBe("中文标题");
    expect(slugify("Hello 世界")).toBe("hello-世界");
    expect(slugify("中文 标题")).toBe("中文-标题");
  });

  it("should fall back when slug is empty", () => {
    expect(slugify("！！！")).toBe("untitled");
    expect(slugify("   ")).toBe("untitled");
  });

  it("should fold full-width ASCII forms without changing other Unicode identities", () => {
    expect(slugify("ＡＢＣ")).toBe("abc");
    expect(slugify("１２３")).toBe("123");
    expect(slugify("Ｆｕｌｌ　Ｗｉｄｔｈ")).toBe("full-width");
    expect(slugify("①")).toBe("①");
    expect(slugify("ﬁ")).toBe("ﬁ");
    expect(slugify("™")).toBe("untitled");
  });

  it("should collapse whitespace and existing hyphens", () => {
    expect(slugify("A - B")).toBe("a-b");
    expect(slugify("a--b")).toBe("a-b");
    expect(slugify("中文 - 标题")).toBe("中文-标题");
  });

  it("should trim edge hyphens after Unicode-safe truncation", () => {
    expect(slugify("- foo -")).toBe("foo");
    expect(slugify("---")).toBe("untitled");
    expect(slugify(`${"a".repeat(79)}-b`)).toBe("a".repeat(79));
    expect(slugify(`${"a".repeat(79)}𐐀`)).toBe("a".repeat(79));
  });

  it("should guard Windows reserved device names", () => {
    expect(slugify("con")).toBe("_con");
    expect(slugify("CON")).toBe("_con");
    expect(slugify("COM1")).toBe("_com1");
    expect(slugify("LPT9")).toBe("_lpt9");
    expect(slugify("COM¹")).toBe("_com¹");
    expect(slugify("LPT³")).toBe("_lpt³");
    expect(slugify("NUL")).toBe("_nul");
    expect(slugify("console")).toBe("console");
  });

  it("should avoid colliding with the special INDEX/LOG pages", () => {
    expect(slugify("index")).toBe("index-page");
    expect(slugify("log")).toBe("log-page");
    expect(slugify("Index")).toBe("index-page");
    expect(slugify("index-page")).toBe("index-page");
    expect(slugify("ᴵndex")).toBe("ᴵndex");
    expect(slugify("ᴸog")).toBe("ᴸog");
  });
});
