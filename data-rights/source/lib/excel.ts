import { fullText, records, sectionNames, type RecordItem } from './records';

const enc = new TextEncoder();
const xml = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const u16 = (n: number) => [n & 255, (n >>> 8) & 255];
const u32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
function crc32(bytes: Uint8Array) { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let k=0;k<8;k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ 0xffffffff) >>> 0; }
function join(parts: Uint8Array[]) { const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0)); let pos=0; for(const p of parts){ result.set(p,pos); pos+=p.length; } return result; }
// A ZIP archive with stored entries is sufficient for Office Open XML and avoids external dependencies.
function zip(files: Record<string,string>) {
  const locals: Uint8Array[] = []; const central: Uint8Array[] = []; let offset=0;
  for (const [path,content] of Object.entries(files)) {
    const name=enc.encode(path), data=enc.encode(content), crc=crc32(data);
    const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]);
    locals.push(local,name,data);
    const header=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]);
    central.push(header,name); offset += local.length+name.length+data.length;
  }
  const cd=join(central), eocd=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(Object.keys(files).length),...u16(Object.keys(files).length),...u32(cd.length),...u32(offset),...u16(0)]);
  return join([...locals,cd,eocd]);
}
const col=(i:number) => { let s=''; for(let n=i+1;n>0;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; };
export function downloadExcel(items: RecordItem[] = records) {
  const head=['编号','一级分类','资料类型','地区','标题','发布 / 来源机构','日期','摘要','关键词标签','原文状态','原文或来源说明','来源链接','补充说明'];
  const rows = items.map(r=>[r.id,sectionNames[r.section],r.kind,r.region,r.title,r.agency,r.date,r.summary,r.keywords.join('；'),fullText(r)?'站内全文':'来源说明，完整原文见链接',fullText(r)||r.excerpt||'',r.url,r.note||'']);
  const data=[head,...rows].map((row,ri)=>`<row r="${ri+1}"${ri===0?' ht="28" customHeight="1"':''}>${row.map((v,i)=>`<c r="${col(i)}${ri+1}" t="inlineStr" s="${ri===0?1:2}"><is><t xml:space="preserve">${xml(String(v).slice(0,32767))}</t></is></c>`).join('')}</row>`).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:M${rows.length+1}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${[10,16,18,10,42,25,15,55,35,24,75,56,50].map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${data}</sheetData><autoFilter ref="A1:M${rows.length+1}"/></worksheet>`;
  const files:Record<string,string>={
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="综合数据库" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml':'<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Microsoft YaHei"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Microsoft YaHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF153C85"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml':sheet
  };
  const bytes=zip(files); const blob=new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); const href=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=href; a.download=`数据产权与数据集交易综合数据库_${items.length}条.xlsx`; a.click(); setTimeout(()=>URL.revokeObjectURL(href),1000);
}
