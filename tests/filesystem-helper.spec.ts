import { getFileContent } from "../src/filesystem-helper";

describe("getFileContent", () => {
  it("should return the contents of an existing file", () => {
    const file = getFileContent("./tests/test-files/emptyroot.xml");
    expect(file).toMatch(new RegExp("^<TrustFrameworkPolicies/>"));
  });

  it("should throw an error for a non-existent file", () => {
    expect(() => getFileContent("non-existent.xml")).toThrowError(
      new RegExp("^File '(.+?)non-existent.xml' does not exist$"),
    );
  });

  it("resolve different relatives paths to the same file", () => {
    const file1 = getFileContent("./test-files/emptyroot.xml", "./tests");
    const file2 = getFileContent("tests/test-files/emptyroot.xml");
    expect(file1).toMatch(file2);
  });
});
