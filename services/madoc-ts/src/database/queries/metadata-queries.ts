import { MetadataUpdate } from '../../types/schemas/metadata-update';
import { sql } from 'slonik';
import { SQL_COMMA, SQL_INT_ARRAY } from '../../utility/postgres-tags';

export function getDerivedMetadata(resource_id: number, resource_type: string, site_id: number) {
  return sql<{
    key: string;
    value: string;
    language: string;
    source: string;
    edited: boolean;
    auto_update: boolean;
    readonly: boolean;
    data: any;
  }>`
    select 
        im.id,
        im.key, 
        im.value, 
        im.language, 
        im.source,
        im.edited,
        im.auto_update,
        im.readonly,
        im.data
    from iiif_derived_resource ifd
    left join  iiif_metadata im 
        on ifd.resource_id = im.resource_id 
    where ifd.site_id=${site_id}
        and ifd.resource_id=${resource_id}
        and ifd.resource_type=${resource_type}
        and im.site_id=${site_id}
  `;
}

export function addDerivedMetadata(added: MetadataUpdate['added'], resource_id: number, site_id: number) {
  if (added.length === 0) {
    return;
  }
  const values = added.map(
    item =>
      sql`(${sql.join(
        [
          item.key,
          item.value,
          item.language,
          item.source || 'madoc',
          resource_id,
          site_id,
          item.readonly || false,
          typeof item.edited !== 'undefined' ? item.edited : true,
          item.auto_update || false,
          item.data || null,
        ],
        SQL_COMMA
      )})`
  );

  return sql`
    insert into iiif_metadata (key, value, language, source, resource_id, site_id, readonly, edited, auto_update, data) values 
    ${sql.join(values, SQL_COMMA)}
  `;
}

export function updateDerivedMetadata(updated: MetadataUpdate['modified'], resource_id: number, site_id: number) {
  if (updated.length === 0) {
    return;
  }

  const values = updated.map(
    item =>
      sql`(${sql.join(
        [
          Number(item.id),
          item.value,
          item.language,
          true, // edited
          false, // readonly
          false, // auto-update
          item.data || null,
        ],
        SQL_COMMA
      )})`
  );

  return sql`
      with input (id, value, language, edited, readonly, auto_update, data) as (values ${sql.join(values, SQL_COMMA)})
      update iiif_metadata as m
      set value         = input.value::text,
          language      = input.language::text,
          edited        = input.edited::bool,
          readonly      = input.readonly::bool,
          auto_update   = input.auto_update::bool,
          data          = input.data::json
      from input
      where input.id::int      = m.id::int 
        and m.resource_id = ${Number(resource_id)}::int 
        and m.site_id     = ${Number(site_id)}::int
  `;
}

export function deleteDerivedMetadata(ids: number[], resource_id: number, site_id: number) {
  if (ids.length === 0) {
    return;
  }

  return sql`
    delete from iiif_metadata 
    where id            = any (${sql.array(ids, SQL_INT_ARRAY)}) 
      and site_id       = ${Number(site_id)} 
      and resource_id   = ${Number(resource_id)}
  `;
}
