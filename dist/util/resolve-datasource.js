/**
 * Resolves a database_id to its primary data_source_id.
 * SDK v5 uses dataSources.query() which requires data_source_id.
 */
export async function resolveDataSourceId(client, databaseId) {
    const db = await client.databases.retrieve({ database_id: databaseId });
    const fullDb = db;
    if (!fullDb.data_sources?.length) {
        throw new Error(`No data sources found for database ${databaseId}`);
    }
    return fullDb.data_sources[0].id;
}
//# sourceMappingURL=resolve-datasource.js.map