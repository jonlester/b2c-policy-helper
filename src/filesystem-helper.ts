import { 
    parse as parsePath, 
    join as pathJoin, 
    resolve as resolvePath 
} from "path";
import fs from "fs";

/**
 * 
 * @param path relative path to the file
 * @param relativeTo if provided, the path parameter will be relative to directory of this path
 * @returns 
 */
export function getFileContent(path: string, relativeTo?: string): string {
    path = projectRelativePath(path, relativeTo);
    if (fs.existsSync(path))
    {
        return fs.readFileSync(path, 'utf8');
    } 
    else throw new Error(`File '${path}' does not exist`);
  }

export function writeFileContent(path: string, content: string, relativeTo?: string) {
    path = projectRelativePath(path, relativeTo);
    const dir = parsePath(path).dir;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path, content, 'utf8');
    //todo: return something useful that can be written to the console or logger
    //console.log(`   ...Policy written to '${path}'`)
}

export function clearDirectory(path: string) {
    path = projectRelativePath(path);
    if(fs.existsSync(path)){
        fs.rmSync(path, { recursive: true });
    }
}

function projectRelativePath(path: string, relativeTo?: string) : string {
    if (relativeTo) {
        const parsed = parsePath(mergePaths(projectRootPath(), relativeTo));
        const folderPath = (parsed.ext == "") ? `${parsed.dir}/${parsed.name}` : parsed.dir;
        path = mergePaths(folderPath, path);
    }
    return mergePaths(projectRootPath(), path);
}

function mergePaths(basePath: string, relativePath: string) {
    // Use path.resolve to merge the paths without repetition
    const mergedPath = resolvePath(basePath, relativePath);
    // Check if the resulting path is inside the base path
    if (mergedPath.startsWith(resolvePath(basePath))) {
      return mergedPath;
    } else {
      throw new Error('Path traversal attempt failed to resolve to a path inside the base path');
    }
  }

//assumes the location of this file is //root/src 
function projectRootPath() {
    return resolvePath(__dirname, '../');
}
  