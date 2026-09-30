const fs = require('fs');
const path = require('path');

function patchFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) {
        console.log(`[patch-onedrive] Skipping (file not found): ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const { search, replace, name } of replacements) {
        if (content.includes(replace)) {
            console.log(`[patch-onedrive] Already patched: ${name} in ${path.basename(filePath)}`);
            continue;
        }

        if (content.includes(search)) {
            content = content.replace(search, replace);
            modified = true;
            console.log(`[patch-onedrive] Successfully applied: ${name} in ${path.basename(filePath)}`);
        } else {
            console.warn(`[patch-onedrive] Target search pattern not found for: ${name} in ${path.basename(filePath)}`);
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

console.log('[patch-onedrive] Applying Windows OneDrive / ReparsePoint compatibility patch to @expo/metro-file-map...');

const expoMetroFileMapDir = path.join(__dirname, '..', 'node_modules', '@expo', 'metro-file-map');

if (fs.existsSync(expoMetroFileMapDir)) {
    // 1. Patch crawlers/node/index.js
    patchFile(
        path.join(expoMetroFileMapDir, 'build', 'crawlers', 'node', 'index.js'),
        [
            {
                name: 'Validate symlink via lstat on Windows in node crawler',
                search: `const file = directory + path.sep + name;
                    const isSymbolicLink = entry.isSymbolicLink();`,
                replace: `const file = directory + path.sep + name;
                    let isSymbolicLink = entry.isSymbolicLink();
                    if (isSymbolicLink && process.platform === 'win32') {
                        try {
                            isSymbolicLink = fs.lstatSync(file).isSymbolicLink();
                        } catch {
                            isSymbolicLink = false;
                        }
                    }`
            }
        ]
    );

    // 2. Patch crawlers/node/fallback.js
    patchFile(
        path.join(expoMetroFileMapDir, 'build', 'crawlers', 'node', 'fallback.js'),
        [
            {
                name: 'Validate symlink via lstat on Windows in fallback crawler',
                search: `            else if (entry.isSymbolicLink()) {
                // We can skip reading the symlink target here, since it'll be read lazily
                if (includeSymlinks && !result.has(name)) {
                    result.set(name, [null, 0, 0, null, 1, null]);
                }
            }
            else if (entry.isFile()) {
                const ext = path_1.default.extname(name).slice(1);
                if (exts[ext] && !result.has(name)) {
                    result.set(name, [null, 0, 0, null, 0, null]);
                }
            }`,
                replace: `            else if (entry.isSymbolicLink()) {
                let isRealSym = true;
                if (process.platform === 'win32') {
                    try {
                        isRealSym = fs_1.default.lstatSync(childAbsolutePath).isSymbolicLink();
                    } catch {
                        isRealSym = false;
                    }
                }
                if (isRealSym) {
                    if (includeSymlinks && !result.has(name)) {
                        result.set(name, [null, 0, 0, null, 1, null]);
                    }
                } else {
                    const ext = path_1.default.extname(name).slice(1);
                    if (exts[ext] && !result.has(name)) {
                        result.set(name, [null, 0, 0, null, 0, null]);
                    }
                }
            }
            else if (entry.isFile()) {
                const ext = path_1.default.extname(name).slice(1);
                if (exts[ext] && !result.has(name)) {
                    result.set(name, [null, 0, 0, null, 0, null]);
                }
            }`
            }
        ]
    );

    // 3. Patch build/index.js
    patchFile(
        path.join(expoMetroFileMapDir, 'build', 'index.js'),
        [
            {
                name: 'Catch EINVAL in maybeReadLink',
                search: `        if (fileMetadata[constants_1.default.SYMLINK] === 1) {
            return fs_1.promises
                .readlink(this.#pathUtils.normalToAbsolute(normalPath))
                .then((symlinkTarget) => {
                fileMetadata[constants_1.default.VISITED] = 1;
                fileMetadata[constants_1.default.SYMLINK] = (0, normalizePathSeparatorsToPosix_1.default)(this.#pathUtils.resolveSymlinkToNormal(normalPath, symlinkTarget));
            });
        }`,
                replace: `        if (fileMetadata[constants_1.default.SYMLINK] === 1) {
            return fs_1.promises
                .readlink(this.#pathUtils.normalToAbsolute(normalPath))
                .then((symlinkTarget) => {
                fileMetadata[constants_1.default.VISITED] = 1;
                fileMetadata[constants_1.default.SYMLINK] = (0, normalizePathSeparatorsToPosix_1.default)(this.#pathUtils.resolveSymlinkToNormal(normalPath, symlinkTarget));
            })
            .catch((error) => {
                if (error && error.code === 'EINVAL') {
                    fileMetadata[constants_1.default.SYMLINK] = 0;
                    fileMetadata[constants_1.default.VISITED] = 1;
                    return;
                }
                throw error;
            });
        }`
            },
            {
                name: 'Allow EINVAL in applyFileDelta readLink errors',
                search: `if (['ENOENT', 'EACCESS'].includes(error.code ?? '')) {`,
                replace: `if (['ENOENT', 'EACCESS', 'EINVAL'].includes(error.code ?? '')) {`
            }
        ]
    );

    // 4. Patch build/lib/TreeFS.js
    patchFile(
        path.join(expoMetroFileMapDir, 'build', 'lib', 'TreeFS.js'),
        [
            {
                name: 'Handle EINVAL in TreeFS resolveSymlink',
                search: `            try {
                const literalSymlinkTarget = fs_1.default.readlinkSync(absoluteSymlink);
                const normalTarget = this.#pathUtils.resolveSymlinkToNormal(canonicalPathOfSymlink, literalSymlinkTarget);
                symlinkNode[constants_1.default.SYMLINK] = (0, normalizePathSeparatorsToPosix_1.default)(normalTarget);
                symlinkNode[constants_1.default.VISITED] = 1;
                return normalTarget;
            }
            catch {
                return undefined;
            }`,
                replace: `            try {
                const literalSymlinkTarget = fs_1.default.readlinkSync(absoluteSymlink);
                const normalTarget = this.#pathUtils.resolveSymlinkToNormal(canonicalPathOfSymlink, literalSymlinkTarget);
                symlinkNode[constants_1.default.SYMLINK] = (0, normalizePathSeparatorsToPosix_1.default)(normalTarget);
                symlinkNode[constants_1.default.VISITED] = 1;
                return normalTarget;
            }
            catch (err) {
                if (err && err.code === 'EINVAL') {
                    symlinkNode[constants_1.default.SYMLINK] = 0;
                    symlinkNode[constants_1.default.VISITED] = 1;
                    return canonicalPathOfSymlink;
                }
                return undefined;
            }`
            }
        ]
    );
}

console.log('[patch-onedrive] Done.');
