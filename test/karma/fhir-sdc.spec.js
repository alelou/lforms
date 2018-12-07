// Tests for FHIR SDC library
var fhirVersions = Object.keys(LForms.Util.FHIRSupport);
for (var i=0, len=fhirVersions.length; i<len; ++i) {
  (function (fhirVersion) {
    var fhir = LForms.FHIR[fhirVersion];
    describe(fhirVersion, function() {
      describe('FHIR SDC library', function() {
        describe('itemToQuestionnaireItem', function() {

          it('should convert code system', function() {

            var codeSystem = "LOINC";
            var fhirCodeSystem = fhir.SDC._getCodeSystem(codeSystem);
            assert.equal(fhirCodeSystem, "http://loinc.org");
          });

          it('should covert an item with ST data type', function () {
            var item = {
              "questionCodeSystem":"LOINC",
              "questionCode": "54125-0",
              "questionCardinality": {"min": "1", "max": "*"},
              "question": "Name",
              "dataType": "ST",
              "_codePath": "/54126-8/54125-0",
              "_idPath": "/1/1"
            };
            var out = fhir.SDC._processItem(item, {});
            assert.equal(out.required, undefined);
            assert.equal(out.repeats, true);
            assert.equal(out.linkId, "/54126-8/54125-0");
            assert.equal(out.text, "Name");
            assert.equal(out.type, "string");
            assert.equal(out.code[0].system,"http://loinc.org");
            assert.equal(out.code[0].code,"54125-0");

          });

          it('should convert an item with CNE data type without answerCodeSystem', function () {
            var cneFixture = window[fhirVersion+'_'+'cneDataTypeFixture'];
            var out = fhir.SDC._processItem(cneFixture.input, {});
            assert.deepEqual(out, cneFixture.output);
          });

          it('should convert an item with answerCodeSystem', function () {
            var alFixture = window[fhirVersion+'_'+'alWithCodeSystemFixture'];
            var out = fhir.SDC._processItem(alFixture.input, {});
            assert.deepEqual(out, alFixture.output);
          });

          it('should convert an item with SECTION data type, with skip logic and sub items', function () {
            var item = {
              "questionCode": "54137-5X",
              "questionCardinality": {"min": "1", "max": "*"},
              "question": "Mock-up section: Shown when Height = 15",
              "dataType": "SECTION",
              // level 3
              "items": [
                { "questionCode": "54140-9X",
                  "questionCardinality": {"min": "1", "max": "1"},
                  "question": "Mock-up sub item #1",
                  "dataType": "INT",
                  "_codePath": "/54126-8/54137-5X/54140-9X",
                  "_idPath": "/1/1/1"
                },
                {
                  "questionCode": "54130-0X",
                  "questionCardinality": {"min": "1", "max": "1"},
                  "question": "Mock-up sub item #2",
                  "dataType": "REAL",
                  "_codePath": "/54126-8/54137-5X/54130-0X",
                  "_idPath": "/1/1/1"
                }
              ],
              "_codePath": "/54126-8/54137-5X",
              "_idPath": "/1/1"
            };

            var out = fhir.SDC._processItem(item, {});
            assert.equal(out.required, undefined);
            assert.equal(out.repeats, true);
            assert.equal(out.linkId, "/54126-8/54137-5X");
            assert.equal(out.text, "Mock-up section: Shown when Height = 15");
            assert.equal(out.type, "group");

            assert.equal(out.item.length, 2);
            assert.equal(out.item[0].required, undefined);
            assert.equal(out.item[0].repeats, undefined);
            assert.equal(out.item[0].linkId, "/54126-8/54137-5X/54140-9X");
            assert.equal(out.item[0].text,"Mock-up sub item #1");
            assert.equal(out.item[0].type,"integer");
            assert.equal(out.item[1].required, undefined);
            assert.equal(out.item[1].repeats, undefined);
            assert.equal(out.item[1].linkId, "/54126-8/54137-5X/54130-0X");
            assert.equal(out.item[1].text,"Mock-up sub item #2");
            assert.equal(out.item[1].type,"decimal");

          });

        });

        describe('Questionnaire to lforms item conversion', function () {
          it('should convert defaultAnswers',function () {
            var fixtures = window['defaultAnswers'];
            for (var i = 0; i < fixtures.length; i++) {
              var fixture = angular.copy(fixtures[i]);
              // STU3 does not support multiple default answers.
              if (!Array.isArray(fixture.defaultAnswer) || fhirVersion === 'R4') {
                var qItem = {};
        
                qItem.type = LForms.FHIR[fhirVersion].SDC._handleDataType(fixture);
                LForms.FHIR[fhirVersion].SDC._handleInitialValues(qItem,fixture);
                // Default processing depends on the answer repeat.
                if (fixture.answerCardinality && fixture.answerCardinality.max === "*") {
                  qItem.extension = [];
                  qItem.extension.push({
                    "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-answerRepeats",
                    "valueBoolean": true
                  });
                }
                var lfItem = {};
                LForms.FHIR[fhirVersion].SDC._processDataType(lfItem,qItem);
                LForms.FHIR[fhirVersion].SDC._processDefaultAnswer(lfItem,qItem);
                assert.deepEqual(lfItem.defaultAnswer,fixture.defaultAnswer);
              }
            }
          });
          
          it('should convert FHTData to lforms', function () {
            var fhirQ = LForms.Util.getFormFHIRData('Questionnaire', fhirVersion, angular.copy(FHTData));
            var convertedLfData = LForms.Util.convertFHIRQuestionnaireToLForms(fhirQ, fhirVersion);

            assert.equal(convertedLfData.name, 'USSG-FHT, (with mock-up items for skip logic demo)');
            assert.equal(convertedLfData.code, '54127-6N');
            assert.equal(convertedLfData.codeSystem, 'LOINC');
            assert.equal(convertedLfData.items.length, 2);
            assert.equal(convertedLfData.items[0].question, "Your health information");
            assert.equal(convertedLfData.items[0].questionCode, "54126-8");
            assert.equal(convertedLfData.items[0].questionCodeSystem, "LOINC");
            assert.equal(convertedLfData.items[0].questionCodeSystem, "LOINC");
            assert.equal(convertedLfData.items[0].dataType, 'SECTION');
            assert.equal(convertedLfData.items[0].header, true);
            assert.equal(convertedLfData.items[0].items.length, 13);

            assert.equal(convertedLfData.items[0].items[0].question, "Name");
            assert.equal(convertedLfData.items[0].items[0].questionCode, "54125-0");
            assert.equal(convertedLfData.items[0].items[0].questionCodeSystem, "LOINC");
            assert.equal(convertedLfData.items[0].items[0].questionCardinality.min, "1");
            assert.equal(convertedLfData.items[0].items[0].questionCardinality.max, "*");
            assert.equal(convertedLfData.items[0].items[0].questionCodeSystem, "LOINC");
            assert.equal(convertedLfData.items[0].items[0].dataType, 'TX');

            assert.equal(convertedLfData.items[0].items[1].answers.length, 3);
            assert.equal(convertedLfData.items[0].items[1].answers[0].text, "Male");
            assert.equal(convertedLfData.items[0].items[1].answers[0].code, "LA2-8");
            assert.equal(convertedLfData.items[0].items[1].answers[2].text, "Other");
            assert.equal(convertedLfData.items[0].items[1].answers[2].code, "LA46-8");
            // TODO - other not supported
            //assert.equal(convertedLfData.items[0].items[1].answers[2].other, "Please Specify");
            assert.equal(convertedLfData.items[0].items[1].dataType, "CNE");

            // TODO - skip logic triggers for min/max inclsuive/exclusive are not supported.
            // Only skip logic 'value' works in STU3
            assert.deepEqual(convertedLfData.items[0].items[4].skipLogic, FHTData.items[0].items[4].skipLogic);
            assert.deepEqual(convertedLfData.items[0].items[12].items[2].skipLogic, FHTData.items[0].items[12].items[2].skipLogic);
            if(fhirVersion !== 'STU3') {
              assert.deepEqual(convertedLfData.items[0].items[6].items[1].skipLogic, FHTData.items[0].items[6].items[1].skipLogic);
              assert.deepEqual(convertedLfData.items[0].items[6].items[2].skipLogic, FHTData.items[0].items[6].items[2].skipLogic);
            }

            assert.equal(convertedLfData.items[0].items[6].answerCardinality.min, "1");
            assert.equal(convertedLfData.items[0].items[6].codingInstructions, "Try to type 10, 12, 15, 16, 25");
            // TODO units[x].default is not supported. units[x].code is not supported.
            assert.equal(convertedLfData.items[0].items[6].units.length, 2);
            assert.equal(convertedLfData.items[0].items[6].units[0].name, "inches");
            assert.equal(convertedLfData.items[0].items[6].units[1].name, "centimeters");

            // Display control
            fhirQ = fhir.SDC.convertLFormsToQuestionnaire(new LForms.LFormsData(displayControlsDemo));
            convertedLfData = fhir.SDC.convertQuestionnaireToLForms(fhirQ);

            // TODO -
            // unsupported fields: viewMode, css, colCSS, listColHeaders, answerLayout.columns
            // supported fields: questionLayout, answerLayout.type
            assert.equal(convertedLfData.items[1].displayControl.answerLayout.type, "RADIO_CHECKBOX");
            // Vertical layout is not converted as it is default.
            assert.equal(convertedLfData.items[5].displayControl, undefined);
            assert.equal(convertedLfData.items[6].displayControl.questionLayout, "horizontal");
          });

          it('should convert restrictions', function () {
            var fhirQ = LForms.Util.getFormFHIRData('Questionnaire', fhirVersion, angular.copy(validationTestForm));
            var convertedLfData = LForms.Util.convertFHIRQuestionnaireToLForms(fhirQ, fhirVersion);

            assert.equal(convertedLfData.items.length, 33);
            // TODO - min/max exclusive is not supported
            assert.equal(convertedLfData.items[12].restrictions.minInclusive, 5);
            assert.equal(convertedLfData.items[14].restrictions.maxInclusive, 10);
            assert.equal(convertedLfData.items[21].restrictions.minLength, 5);
            assert.equal(convertedLfData.items[22].restrictions.maxLength, 10);
          });

          it('should convert externally defined', function () {
            var optionsRes = validationTestForm.items[23].externallyDefined;
            var fhirQ = fhir.SDC.convertLFormsToQuestionnaire(new LForms.LFormsData(validationTestForm));
            var convertedLfData = fhir.SDC.convertQuestionnaireToLForms(fhirQ);

            assert.equal(convertedLfData.items.length, 33);
            assert.equal(convertedLfData.items[23].externallyDefined, optionsRes);
          });
        });



        describe('LForms data to Questionnaire conversion', function() {

          it('should convert to SDC Questionnaire with extensions', function() {
            var fhirQ = fhir.SDC.convertLFormsToQuestionnaire(new LForms.LFormsData(angular.copy(FHTData)));

            assert.equal(fhirQ.meta.profile[0], fhir.SDC.QProfile);
            assert.equal(fhirQ.item[0].item[1].extension[0].url, "http://hl7.org/fhir/StructureDefinition/questionnaire-minOccurs");
            assert.equal(fhirQ.item[0].item[1].extension[1].url, "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl");

          });

          it('should convert to standard Questionnaire without any extensions', function() {
            var fhirQ = fhir.SDC.convertLFormsToQuestionnaire(new LForms.LFormsData(angular.copy(FHTData)), true);

            assert.equal(fhirQ.meta.profile[0], fhir.SDC.stdQProfile);
            assert.equal(fhirQ.item[0].item[1].extension, undefined);

            assert.equal(fhirQ.toString().match(/extension/), undefined);

          });

          it('should handle the calculatedExpression extension', function() {
            // Load the Weight & Height questionnaire, and convert it to LForms.
            // Then, we'll try converting it back.
            var fhirQ = {
              "resourceType": "Questionnaire",
              "identifier": [
                {
                  "system": "http://loinc.org",
                  "value": "55418-8"
                }
              ],
              "code": [
                {
                  "system": "http://loinc.org",
                  "code": "55418-8"
                }
              ],
              "item": [
                {
                  "extension": [
                    {
                      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-calculatedExpression",
                      "valueExpression": {
                        "description": "BMI calculation",
                        "language" : "text/fhirpath",
                        "expression": "item.where(linkId='/29463-7').answer.valueQuantity.value/item.where(linkId='/8302-2').answer.valueQuantity.value/item.where(linkId='/8302-2').answer.valueQuantity.value/0.0254/0.0254"
                      }
                    }
                  ],
                  "linkId": "/39156-5",
                  "code": [
                    {
                      "system": "http://loinc.org",
                      "code": "39156-5",
                      "display": "BMI"
                    }
                  ],
                  "text": "BMI",
                  "type": "decimal"
                }
              ]
            };
            var lformsQ = fhir.SDC.convertQuestionnaireToLForms(fhirQ);
            var convertedFHIRQ = fhir.SDC.convertLFormsToQuestionnaire(lformsQ);
            // Confirm that we got the exension back.
            assert.equal(convertedFHIRQ.item[0].extension[0].url,
              fhirQ.item[0].extension[0].url);
          });

          if(fhirVersion === 'STU3') {
            describe.only('argonaut samples', function () {
              it('should parse housing', function (done) {
                var file = 'test/data/STU3/argonaut-examples/housing.json';
                $.get(file, function(json) {
                  var lfData = LForms.Util.convertFHIRQuestionnaireToLForms(json, fhirVersion);
                  var convertedQ = LForms.Util._convertLFormsToFHIRData('Questionnaire', fhirVersion, lfData);
                  assert.equal(convertedQ.item[0].item[1].option.length, json.item[0].item[1].option.length);
                  assert.equal(convertedQ.item[0].item[2].option.length, json.item[0].item[2].option.length);

                  // valueString is changed to valueCoding.display
                  assert.equal(convertedQ.item[0].item[1].option[0].valueCoding.display, json.item[0].item[1].option[0].valueString);

                }).done(function () {
                  done();
                }).fail(function (err) {
                  done(err);
                });
              });

              it.only('should parse sampler', function (done) {
                var file = 'test/data/STU3/argonaut-examples/sampler.json';
                $.get(file, function(json) {
                  var lfData = LForms.Util.convertFHIRQuestionnaireToLForms(json, fhirVersion);
                  var convertedQ = LForms.Util._convertLFormsToFHIRData('Questionnaire', fhirVersion, lfData);

                  assert.equal(convertedQ.item[11].item[0].option.length, json.item[11].item[0].option.length);
                  // The score is changed from argonaut extension to FHIR extension.
                  assert.equal(convertedQ.item[11].item[0].option[0].extension[0].url,
                    'http://hl7.org/fhir/StructureDefinition/questionnaire-ordinalValue');
                  assert.equal(convertedQ.item[11].item[0].option[0].extension[0].valueDecimal,
                    json.item[11].item[0].option[0].extension[0].valueDecimal);
                }).done(function () {
                  done();
                }).fail(function (err) {
                  done(err);
                });
              });
            });
          }


        });

        describe('LForms data to QuestionnaireResponse conversion', function() {

          it('should convert to SDC Questionnaire with extensions', function() {
            var fhirQR = LForms.Util.getFormFHIRData('QuestionnaireResponse', fhirVersion, angular.copy(FHTData));

            assert.equal(fhirQR.meta.profile[0], fhir.SDC.QRProfile);

          });

          it('should convert to standard QuestionnaireResponse without any extensions', function() {
            var fhirQR = LForms.Util.getFormFHIRData(
              'QuestionnaireResponse', fhirVersion, angular.copy(FHTData),
              {noExtensions: true});

            assert.equal(fhirQR.meta, undefined);

            assert.equal(fhirQR.toString().match(/extension/), undefined);

          });

        });
      });
    });
  })(fhirVersions[i]);
}

