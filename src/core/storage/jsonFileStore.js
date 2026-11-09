import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * 사용자(Keycloak sub)별 목록을 JSON 파일 하나에 저장하는 간단한 저장소.
 * 쓰기는 큐로 직렬화해서 동시 요청 시 데이터가 덮어써지지 않게 한다.
 */
export function createJsonFileStore(filePath) {
  let writeQueue = Promise.resolve();

  async function readAll() {
    try {
      return JSON.parse(await readFile(filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw error;
    }
  }

  function update(mutator) {
    const run = writeQueue.then(async () => {
      const data = await readAll();
      const result = mutator(data);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(data, null, 2));
      return result;
    });
    writeQueue = run.catch(() => undefined);
    return run;
  }

  return {
    async list(ownerId) {
      const data = await readAll();
      return data[ownerId] ?? [];
    },
    add(ownerId, item) {
      return update((data) => {
        data[ownerId] = [item, ...(data[ownerId] ?? [])];
        return item;
      });
    },
    remove(ownerId, itemId) {
      return update((data) => {
        const before = data[ownerId] ?? [];
        data[ownerId] = before.filter((item) => item.id !== itemId);
        return data[ownerId].length !== before.length;
      });
    },
  };
}
