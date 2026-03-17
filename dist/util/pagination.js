export async function queryAll(client, params) {
    const results = [];
    let cursor = undefined;
    let retries = 0;
    const maxRetries = 3;
    while (true) {
        try {
            const response = await client.dataSources.query({
                data_source_id: params.data_source_id,
                filter: params.filter,
                sorts: params.sorts,
                page_size: params.page_size ?? 100,
                start_cursor: cursor,
                filter_properties: params.filter_properties,
            });
            results.push(...response.results);
            retries = 0;
            if (!response.has_more || !response.next_cursor) {
                break;
            }
            cursor = response.next_cursor;
        }
        catch (err) {
            const apiErr = err;
            if (apiErr.status === 429 && retries < maxRetries) {
                retries++;
                const retryAfter = apiErr.headers?.get?.("Retry-After");
                const parsed = retryAfter ? parseInt(retryAfter, 10) : NaN;
                const delay = Number.isFinite(parsed) ? parsed * 1000 : 1000 * Math.pow(2, retries);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }
            throw err;
        }
    }
    return { results, total: results.length };
}
//# sourceMappingURL=pagination.js.map