API_KEY      = "YOUR_MIXPANEL_API_KEY";
API_SECRET   = "YOUR_MIXPANEL_API_SECRET";
MAIL_ADDRESS = "YOUR_MAIL_ADDRESS";
EVENTS       = ["EVENT1", "EVENT2", "EVENT3"];
INTERVAL     = 12;

data = {
  'unit'     : "hour",
  'interval' : INTERVAL - 1,
  'type'     : "general"
}

function main() {
  for(var i = 0; i < EVENTS.length; i++) {
    check(EVENTS[i]);
  }
}

function check(event) {
  var API_URL = "http://mixpanel.com/api/2.0/events/?";
  var response, jsonString, object, series = [], values = [], i = 0, zeroFg = true;

  try {
    data['event'] = '["' + event + '"]';
    data['sig']   = getSig(data);
    data['event'] = encodeURIComponent(data['event']);

    response = UrlFetchApp.fetch(API_URL + makeParam(data));
    if (!response) {
      Logger.log("no response");
      return;
    }

    jsonString = response.getContentText();
    object     = Utilities.jsonParse(jsonString);
    series     = object.data.series;
    values     = object.data.values[event];

    for(i = 0; i < series.length; i++) {
      if(values[series[i]] > 0) {
        zeroFg = false;
        break;
      }
    }

    if (zeroFg && !exist(event)) {
      Logger.log("zero");
      write(event);
      sendMail(event);
    }
    Logger.log("done!");
  } catch(e) {
    Logger.log(e);
    response = null;
  }
}

function getSig(hash) {
  var keys = [];
  var kv   = "";

  var currentDate = new Date;
  var expire = Math.floor(currentDate.getTime() / 1000) + 600;

  delete hash['sig'];
  hash['api_key'] = API_KEY;
  hash['expire'] = expire;
  hash['format'] = "json";

  for (var k in hash) keys.push(k);
  keys.sort();
  var length = keys.length;
  for(var i = 0; i < length; i++){
    kv += keys[i] + "=" + hash[keys[i]];
  }
  return getMD5Hash(kv + API_SECRET);
}

function getMD5Hash(input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, input);
  var txtHash = '';
  for (j = 0; j < rawHash.length; j++) {
    var hashVal = rawHash[j];
    if (hashVal < 0)
      hashVal += 256;
    if (hashVal.toString(16).length == 1)
      txtHash += "0";
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

function makeParam(hash) {
  var param = "";
  for(var key in hash) {
    param += key + "=" + hash[key] + "&";
  }
  param = param.substring(0, param.length-1);
  return param;
}

function exist(event) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row   = sheet.getLastRow();
  var cell, i, _event, _ave, _date;

  for(i = 1; i <= row; i++) {
    _event = sheet.getRange('A'+ i).getValue();
    _date  = sheet.getRange('B'+ i).getValue();
    if(event == _event && getDateWithFormat() == _date) {
      return true;
    }
  }
  return false;
}

function write(event) {
  var sheet = SpreadsheetApp.getActiveSheet();
  sheet.appendRow([event, getDateWithFormat()]);
}

function sendMail(event, ave, lastValue) {
  MailApp.sendEmail(
    MAIL_ADDRESS,
    "#alert " + event + " event is nothing in " + INTERVAL + " hours",
    "event name: " + event
  );
}

function getDateWithFormat() {
  var date = Utilities.formatDate(new Date(), "JST", "yyyy/MM/dd");
  return '"' + date + '"';
}

