/**
 * @module filesystem-helper
 * @author jolest, ibersano
 * @summary OS-agnostic Helper functions for interacting with the file system
 */

import { parse as parsePath, resolve as resolvePath } from "path";
import fs from "fs";

/**
 * Retrieves file content from the file system. Assumes UTF8 encoding.
 * @param path path to the file, which is relative to the project root or `relativeTo' if provided
 * @param relativeTo if provided, the first path parameter will be relative to directory of this second path
 * @returns File contents as a string
 */
export function getFileContent(path: string, relativeTo?: string): string {
  path = projectRelativePath(path, relativeTo);
  if (fs.existsSync(path)) {
    return fs.readFileSync(path, "utf8");
  } else throw new Error(`File '${path}' does not exist`);
}

/**
 * Writes content to a file.  If the file or folder don't exist, they will be created.
 * Assumes UTF8 encoding.
 * @param path path to the file, which is relative to the project root or `relativeTo' if provided
 * @param content string content to write to the file
 * @param relativeTo if provided, the first path parameter will be relative to directory of this second path
 * @returns absolute path to the file written
 */
export function writeFileContent(path: string, content: string, relativeTo?: string): string {
  path = projectRelativePath(path, relativeTo);
  const dir = parsePath(path).dir;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path, content, "utf8");
  return path;
}

/**
 * Deletes all files and folders in the specified directory
 * @param path relative to the project root
 */
export function clearDirectory(path: string) {
  path = projectRelativePath(path);
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true });
  }
}

/**
 * Converts a relative path to an absolute path, relative to the project root
 */
export function projectRelativePath(path: string, relativeTo?: string): string {
  if (relativeTo) {
    const parsed = parsePath(mergePaths(projectRootPath(), relativeTo));
    const folderPath = parsed.ext == "" ? `${parsed.dir}/${parsed.name}` : parsed.dir;
    path = mergePaths(folderPath, path);
  }
  return mergePaths(projectRootPath(), path);
}

/*
 * Merges two paths, ensuring that the resulting path is inside the base path
 */
export function mergePaths(basePath: string, relativePath: string): string {
  // Use path.resolve to merge the paths without repetition
  const mergedPath = resolvePath(basePath, relativePath);
  // Check if the resulting path is inside the base path
  if (mergedPath.startsWith(resolvePath(basePath))) {
    return mergedPath;
  } else {
    throw new Error("Path traversal attempt failed to resolve to a path inside the base path");
  }
}

/*
 * Gets the absolute file system path to the root of the project
 */
export function projectRootPath(): string {
  return resolvePath(__dirname, "../");
}
/*
 * Gets the filename from a path
 */
export function filenameFromPath(path: string): string {
  return parsePath(path).base;
}
