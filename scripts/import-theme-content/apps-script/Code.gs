// 구글 시트 "kotonoha-machi 테마 콘텐츠"에 붙이는 Apps Script다. propose.mjs --to-sheet가 이 웹 앱
// 주소로 행을 보내면 각 탭 끝에 추가한다. 비밀 토큰(스크립트 속성 SHEET_TOKEN)이 맞아야만 쓴다.
// 같은 테마를 다시 보내면 그 테마의 review=draft 행만 지우고 새로 넣는다(검수한 ok/applied 행은 건드리지 않음).
var TABS = ['themes', 'kanji', 'vocabulary', 'examples'];

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var expected = PropertiesService.getScriptProperties().getProperty('SHEET_TOKEN');
  if (!expected || body.token !== expected) {
    return respond({ ok: false, error: 'unauthorized' });
  }
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var counts = {};
  TABS.forEach(function (name) {
    var rows = (body.rows && body.rows[name]) || [];
    var sheet = spreadsheet.getSheetByName(name);
    if (name === 'themes') {
      counts[name] = appendNewThemes(sheet, rows);
    } else {
      removeDraftRows(sheet, body.theme);
      counts[name] = append(sheet, rows);
    }
  });
  return respond({ ok: true, counts: counts });
}

// themes 탭: 이미 있는 제목은 건너뛴다.
function appendNewThemes(sheet, rows) {
  var existing = sheet.getDataRange().getValues().map(function (row) { return row[0]; });
  return append(sheet, rows.filter(function (row) { return existing.indexOf(row[0]) === -1; }));
}

// 다른 탭: 첫 열이 theme, 마지막 열이 review다. 해당 테마의 draft 행을 아래에서부터 지운다.
function removeDraftRows(sheet, theme) {
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    var row = values[i];
    if (row[0] === theme && row[row.length - 1] === 'draft') {
      sheet.deleteRow(i + 1);
    }
  }
}

function append(sheet, rows) {
  if (rows.length === 0) {
    return 0;
  }
  var start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
  return rows.length;
}

function respond(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}
