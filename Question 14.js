const date_parts = {
  'days': 'DAY',
  'weeks': 'WEEK',
  'months': 'MONTH',
  'years': 'YEAR',
};

const status_matrix = {
  "successful deliveries": "'Serahan','Serahan tingkap','POD: Serahan Tingkap','Serahan terus ke Parcel Locker - operasi','POD: Serah kepada Penerima'",
  "failed deliveries": "'Gagal - Enggan Beri Pengenalan','Gagal - Tiada Penerima','Gagal - Tutup','Holiday Close','Gagal - Rosak','Gagal - Kegagalan Operasi','Gagal - Salah Alamat','Gagal - Enggan Terima'",
  "deliveries with other status": "'Menunggu Item Dituntut Di Parcel Locker','POD: Serah kepada Pengirim','Ditahan','Gagal - Future','Currently unable to deliver due to'"
};

function q14_doHandcraftTest() {
  // Logger.log('testing...');
  
  var q14_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Q14');

  let i, api, val;
  let payload, response, json, data;
  const token = ScriptApp.getIdentityToken();

  for (i=3; i<q14_sheet.getLastRow() + 1; i++) {
    let delivery_status = status_matrix[q14_sheet.getRange(i, 8).getValue()];
    api = q14_sheet.getRange(i, 2).getValue();
    val = q14_sheet.getRange(i, 11).getValue(); //results generated
    if (api === 'pos_my_questions' && !val && val !== 0) {
      let delivery_range = q14_sheet.getRange(i, 9).getValue().split('-');
      let delivery_status = status_matrix[q14_sheet.getRange(i, 8).getValue()];
      Logger.log(delivery_status);
      payload = {
        "method": "Q14", // Q21, Q24

        /**
         * 
         * Q21
         * 
         * run_date
         * interval_duration
         * interval_unit
         * event_service_name
         * office_name
         * 
         * CREATE OR REPLACE TABLE `ml-rnd-280405.pos_my_genai.training_table_q2_{randHash}` AS
                SELECT
                    t1.acceptance_date,
                    -- t1.acceptance_event_type_name_display,
                    CASE
                    WHEN t1.acceptance_event_type_name_display IN (
                        'Pickup Cash', 'Pickup Contract'
                    ) THEN 'Pickup Services'
                    WHEN t1.acceptance_event_type_name_display IN(
                        'Customer drop item at Poslaju Drop Box'
                    ) THEN 'Drop-off Services'
                    WHEN t1.acceptance_event_type_name_display IN(
                        'Penerimaan Kaunter', 'Penerimaan daripada PO', 'Terimaan Pengeposan'
                    ) THEN 'Retrieval Services'
                    WHEN t1.acceptance_event_type_name_display IN(
                        'Pengeposan Item Di Parcel Locker'
                    ) THEN 'Posting Services'
                    ELSE CAST(t1.acceptance_event_type_name_display as STRING)
                END AS acceptance_event_services_type_name_display,
                    t1.acceptance_office_name,
                    COUNT(*) AS services_count
                FROM
                    `ml-rnd-280405.pos_my_genai.acpt_del_2022_0803` AS t1
                WHERE t1.acceptance_date BETWEEN DATE_SUB(\'{self.params["run_date"]}\', INTERVAL {self.params["interval_duration"]} {self.params["interval_unit"]}) AND \'{self.params["run_date"]}\' AND acceptance_event_type_name_display IN ({self.params["event_service_name"]}) AND acceptance_office_name = \'{self.params["office_name"]}\'
                GROUP BY acceptance_date, acceptance_event_type_name_display, acceptance_office_name
                -- GROUP BY 1, 2, 3
         */
        "params": {
          'run_date': q14_sheet.getRange(i, 7).getValue().split('/').reverse().join('-'),
          'look_back_num': q14_sheet.getRange(i, 5).getValue().toString(),
          'look_back_type': date_parts[q14_sheet.getRange(i, 6).getValue()],
          'delivery_status': delivery_status,
          'delivery_start': delivery_range.length > 1 ? parseInt(delivery_range[0]) : 0,
          'delivery_end': parseInt(delivery_range[delivery_range.length - 1]),
          'delivery_interval_type': date_parts[q14_sheet.getRange(i, 10).getValue()],
        }
      };
      response = UrlFetchApp.fetch(`https://asia-southeast1-ml-rnd-280405.cloudfunctions.net/pos_my_questions`, {
        'method': 'post',
        'headers': {
          'Authorization': 'Bearer' + token,
          'Content-Type': 'application/json',
        },
        'muteHttpExceptions':true,
        'payload': JSON.stringify(payload)
      });
      json = response.getContentText();
      data = JSON.parse(json);

      Logger.log(data);
      // q14_sheet.getRange(i, 11).setValue(data[0]);
    }
  }
}

function q14_getParams(){
  var q14_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Q14');
  let i, j, api, val;
  let payload, response, json, data;
  const token = ScriptApp.getIdentityToken();
  var count = 0;
  for (i = 3; i < q14_sheet.getLastRow() + 1; i++) {
    api = q14_sheet.getRange(i, 17).getValue();
    for(j = 19; j < 19 + (12 * 3); j += 12){
      val = q14_sheet.getRange(i, j + 8).getValue();
      input_question = q14_sheet.getRange(i, j).getValue();
      if(api === 'pos_my_vertex' && input_question){
        payload = {
          "method": "giveParameters", // giveParameters
          "params": {
            "prompt_name": "q14-parameters-2", // q21-parameters-2, q24-parameters-2
            "input_question": input_question
          }
        };
        response = UrlFetchApp.fetch(`https://asia-southeast1-ml-rnd-280405.cloudfunctions.net/pos_my_vertex`, {
          'method': 'post',
          'headers': {
            'Authorization': 'Bearer' + token,
            'Content-Type': 'application/json',
          },
          'muteHttpExceptions':true, 
          'payload': JSON.stringify(payload)
        });
        json = response.getContentText();
        Logger.log(json);
        data = JSON.parse(json);
        Logger.log(data);
        count ++;
        q14_sheet.getRange(i,j+2).setValue(data["@LOOKBACK_WINDOW_NUM"])
        q14_sheet.getRange(i,j+3).setValue(data["@LOOKBACK_WINDOW_UNIT"].toLowerCase()+"s")
        q14_sheet.getRange(i,j+4).setValue(data["@LOOKBACK_WINDOW_END"])
        q14_sheet.getRange(i,j+5).setValue(data["@DELIVERY_STATUS"])
        q14_sheet.getRange(i,j+6).setValue(data["@DELIVERY_INTERVAL_START"]+"-"+data["@DELIVERY_INTERVAL_END"])
        q14_sheet.getRange(i,j+7).setValue(data["@DELIVERY_INTERVAL_UNIT"].toLowerCase()+"s")
        // q14_sheet.getRange(i, 26).setValue(data[0]['f0_']);
      }
    }
  }
  Logger.log(count)
}

function q14_doGenaiTest() {
  // Logger.log('testing...');
  var q14_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Q14');
  
  let i, api, val;
  let payload, response, json, data;
  const token = ScriptApp.getIdentityToken();

  for (i=3; i<q14_sheet.getLastRow() + 1; i++) {
    api = q14_sheet.getRange(i, 17).getValue();
    Logger.log(api);
    for(j = 19; j < 19 + (12 * 3); j += 12){
      val = q14_sheet.getRange(i, j + 8).getValue();
      input_question = q14_sheet.getRange(i, j).getValue();
      Logger.log(input_question);
      if (api === 'pos_my_vertex' && !val && val !== 0 && input_question) {
        payload = {
          "method": "solveQuestion", // giveParameters
          "params": {
            "prompt_name": "q14-parameters-2", // q21-parameters-2, q24-parameters-2
            "input_question": input_question
          }
        };
        response = UrlFetchApp.fetch(`https://asia-southeast1-ml-rnd-280405.cloudfunctions.net/pos_my_vertex`, {
          'method': 'post',
          'headers': {
            'Authorization': 'Bearer' + token,
            'Content-Type': 'application/json',
          },
          'muteHttpExceptions':true, 
          'payload': JSON.stringify(payload)
        });
        json = response.getContentText();
        Logger.log(json);
        data = JSON.parse(json);
        Logger.log(data);
        q14_sheet.getRange(i,j+8).setValue(data[0]['f0_']);
      }
    }
  }
}
