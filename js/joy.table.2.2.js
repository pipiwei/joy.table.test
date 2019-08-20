function JoyTable(htmlElement, config) {
    
    this.PrivateAddRow = null; ///////////// to do
	this.Debug = false;

    /* the layout struct of table
    2016-05-31
	. auto initial
	
	2016-05-30
	. not sign bug

    2016-05-30 version 2.2
    . support auto unikey. ref timestamp as unikey
    . fix bug. allow null content. default replace null as empty string

    <div class="panel panel-default">                       lev 1
        <div class="list_title panel-heading">              lev 2
            <span name="table_title"></span>
            <span name="table_counter"></span>
            <span name="table_sel_counter></span>
        </div>
        <div class="list_body panel-body">                  lev 2
            <table>                                         lev 3
                <thead>                                     lev 4
                    <th class="group_header"></th>          lev 5
                    <th class="list_header"></th>
                </thead>
                <tbody>
                    <tr class="list_data template"></tr>
                    <tr class="list_data">...</tr>
                    <tr class="list_data">...</tr>
                    ...
                </tbody>
            </table>
        </div>
    </div>
	
	after fix header
	...
	    <div class="list_body panel-body">                  lev 2
			<div>											lev 3
				<table>										lev 4
					<thead>                                 lev 5
						<th class="group_header"></th>      lev 6
						<th class="list_header"></th>
					</thead>
				</table>
			</div>
            <table>                                         lev 3
                <tbody>
                    <tr class="list_data template"></tr>
                    <tr class="list_data">...</tr>
                    <tr class="list_data">...</tr>
                    ...
                </tbody>
            </table>
        </div>
	...
    */

    // lev 1
    this.RootObject = null; // div of the overall root (div)
    // lev 2
    this.HeaderRootObject = null; // header div under root. parent of data counter. to show the info of table. i.e total records. (div div.list_title)
    this.BodyRootObject = null; // body div under root. parent of table. the container of the table element (div div.list_body)

    // original thead container / fake header thead node
    this.TableHeaderDivObject = null;
    this.TableFakeHeaderTheadObject = null;

    // lev 3
    this.TableObject = null; // table root. main table element. (div div table)
    // lev 4
    this.TableTheadObject = null;
    this.TableTbodyObject = null;
    // lev 5
    this.TableGroupHeaderObject = null; // root of group header of table (div div table thead tr.group_header)
    this.TableHeaderObject = null; // root of header of table (div div table thead tr.list_header)

    this.DataSource = null; // binding data source. set when AddRows

    this.Configurations = null; // to remember the table initial parameters
    this.SnColVisible = false; // true: show serial number on row 1st column. set when TableInitial or before AddRows
    this.RowSelectable = false; // true: show checkbox on row 1st column (if serial column not shown). set when TableInitial or before AddRows
    this.Unikeys = null; // uni-key of data source. set when TableInitial
	this.AutoUnikeys = false;
	this.IsAllowShowingNull = false;
    this.GroupNameList = []; // set when TableInitial
    this.ColumnNameList = []; // set when TableInitial

    this.ReservedColNums = 2; // serial number, checkbox 
    this.IsSorting = false;
    this.ScrollOffset = "";

    this.Events = {};
    this.Events.OnChanged = null;
    this.Events.OnRowClicked = null;
    this.Events.OnClear = null;
    if (typeof(htmlElement) != "undefined") {
        this.TableInitial(htmlElement, config);
    }

    this._bindingScrollingEventObj = {
        handleEvent: function (e) {
            this.tableClassObj.OnTableScrolling(e);
        },
        tableClassObj: this,
    };
}

// initial table: create the table html and configure with parameters
JoyTable.prototype.TableInitial = function TableInitial(containObj, parameters) {
    var divHeaderNode = document.createElement("div");
    var divBodyNode = document.createElement("div");
    var tableNode = document.createElement("table");
    var theadNode = document.createElement("thead");
    var tbodyNode = document.createElement("tbody");

    $(containObj).children().remove(); // remove all children

    $(containObj).append($(divHeaderNode));
    $(containObj).append($(divBodyNode));
    $(divBodyNode).append($(tableNode));

    this.RootObject = containObj;
    this.HeaderRootObject = $(divHeaderNode);
    this.BodyRootObject = $(divBodyNode);
    this.TableObject = $(tableNode);
    this.TableObject.attr("id", "table_" + $(containObj).attr("id"));
    this.TableTheadObject = $(theadNode);
    this.TableTbodyObject = $(tbodyNode);
    this.Configurations = parameters;

    var bindingResizeEventObj = {
        handleEvent: function (e) {
            this.tableClassObj.OnResizing(e);
        },
        tableClassObj: this,
    };
    $(window)[0].addEventListener("resize", bindingResizeEventObj, false);

    containObj.removeClass("panel panel-default").addClass("panel panel-default");
    $(divHeaderNode).addClass("list_title");
    $(divHeaderNode).addClass("panel-heading");
    $(divHeaderNode).attr("id", "div_header_" + $(containObj).attr("id"));
    $(divBodyNode).addClass("list_body");
    $(divBodyNode).addClass("panel-body");
    $(divBodyNode).attr("id", "div_body_" + $(containObj).attr("id"));

    // div header content
    var spanTitleNode = document.createElement("span");
    var labelTitleNode = document.createElement("label");
    var spanCounterNode = document.createElement("span");
    var spanSelectedCounterNode = document.createElement("span");
    spanTitleNode.setAttribute("name", "table_title");
    labelTitleNode.setAttribute("name", "table_title");
    spanCounterNode.setAttribute("name", "table_counter");
    spanSelectedCounterNode.setAttribute("name", "table_sel_counter");
    //$(divHeaderNode).append($(spanTitleNode));
    $(divHeaderNode).append($(labelTitleNode));
    $(divHeaderNode).append("&nbsp;");
    $(divHeaderNode).append($(spanCounterNode));
    $(divHeaderNode).append("&nbsp;");
    $(divHeaderNode).append($(spanSelectedCounterNode));
    
    // div body content
    var trGroupHeadersNode = document.createElement("tr"); // group_header
    var trHeadersNode = document.createElement("tr"); // list_header
    var trDataNode = document.createElement("tr"); // list_data

    this.TableGroupHeaderObject = $(trGroupHeadersNode);
    this.TableHeaderObject = $(trHeadersNode);


    //trTitleNode.setAttribute("class", "list_title");
    trGroupHeadersNode.setAttribute("class", "group_header");
    trHeadersNode.setAttribute("class", "list_header");
    trDataNode.setAttribute("class", "list_data template hide");
    trDataNode.setAttribute("id", "data_template_" + $(containObj).attr("id"));
	
    if (typeof (parameters) != "undefined") {
        if (typeof (parameters["list_title"]) != "undefined") {
            var keys = Object.keys(parameters["list_title"]);
            for (var j = 0; j < keys.length; j++) {
                var attrName = keys[j];
                var attrVal = parameters["list_title"][attrName];
                if (attrName == "text") {
                    $(labelTitleNode).text(attrVal);
                }
                else
                    divHeaderNode.setAttribute(attrName, attrVal);
            }
        }
        if (typeof (parameters["list_body"]) != "undefined") {
            var keys = Object.keys(parameters["list_body"]);
            for (var j = 0; j < keys.length; j++) {
                var attrName = keys[j];
                var attrVal = parameters["list_body"][attrName];
                divBodyNode.setAttribute(attrName, attrVal);
            }
        }
        if (typeof (parameters["table"]) != "undefined") {
            var keys = Object.keys(parameters["table"]);
            for (var j = 0; j < keys.length; j++) {
                var attrName = keys[j];
                var attrVal = parameters["table"][attrName];
                if (attrName == "header_text"){
                    //theNode.setAttribute(attrName, attrVal);
                }
                else if (attrName == "show_sn_column") {
                    this.SnColVisible = attrVal;
                }
                else if (attrName == "selectable") {
                    this.RowSelectable = attrVal;
                }
                else {
                    tableNode.setAttribute(attrName, attrVal);
                }
            }
        }
        if (typeof (parameters["groups"]) != "undefined") {
            var lsItems = parameters["groups"];
            var thSnNode = document.createElement("th");
            thSnNode.setAttribute("class", "sn_col");
            thSnNode.setAttribute("style", "display:none;text-align:center");
            thSnNode.setAttribute("name", "serial_number");
            var thCkNode = document.createElement("th");
            thCkNode.setAttribute("class", "cb_col");
            thCkNode.setAttribute("style", "display:none;text-align:center");
            thCkNode.setAttribute("name", "check_row");
            $(trGroupHeadersNode).append(thSnNode);
            $(trGroupHeadersNode).append(thCkNode);

            for (var i = 0; i < lsItems.length; i++) {
                var thNode = document.createElement("th");
                var keys = Object.keys(lsItems[i]);
                var columnName = "";
                var columnSpan = 0;
                for (var j = 0; j < keys.length; j++) {
                    var attrName = keys[j];
                    var attrVal = lsItems[i][attrName];
                    if (attrName == "number_of_column") {
                        thNode.setAttribute("colspan", attrVal);
                        columnSpan = parseInt(attrVal);
                    }
                    else if (attrName == "text") {
                        thNode.innerHTML = attrVal;
                    }
                    else if (attrName == "name" ){
                        columnName = attrVal;
                        thNode.setAttribute(attrName, attrVal);
                    }
                    else {
                        thNode.setAttribute(attrName, attrVal);
                    }
                }
                // todo: add thNode style "border-right: 1px solid #000000" when group change
                for (var j = 0; !isNaN(columnSpan) && j < columnSpan; j++)
                    this.GroupNameList.push(columnName);
                $(trGroupHeadersNode).append(thNode);
            }
        }
        if (typeof (parameters["columns"]) != "undefined") {
            var lsItems = parameters["columns"];
            var thSnNode = document.createElement("th");
            var tdSnNode = document.createElement("td");
            var thCheckNode = document.createElement("th");
            var tdCheckNode = document.createElement("td");
            thSnNode.setAttribute("groups", "SerialNumber");
            thSnNode.setAttribute("groups", "SerialNumber");
            thSnNode.setAttribute("class", "sn_col");
            tdSnNode.setAttribute("class", "sn_col");
            thCheckNode.setAttribute("groups", "Checkbox");
            tdCheckNode.setAttribute("groups", "Checkbox");
            thCheckNode.setAttribute("class", "cb_col");
            tdCheckNode.setAttribute("class", "cb_col");
            thSnNode.setAttribute("style", "display:none;text-align:center");
            tdSnNode.setAttribute("style", "display:none;text-align:center");
            if (this.RowSelectable) {
                thCheckNode.setAttribute("style", "text-align:center");
                tdCheckNode.setAttribute("style", "text-align:center");
            }
            else {
                thCheckNode.setAttribute("style", "display:none;text-align:center");
                tdCheckNode.setAttribute("style", "display:none;text-align:center");
            }
            thSnNode.setAttribute("name", "serial_number");
            tdSnNode.setAttribute("name", "serial_number");
            thCheckNode.setAttribute("name", "check_row");
            tdCheckNode.setAttribute("name", "check_row");
            thCheckNode.innerHTML = "<input type='checkbox' />";
            tdCheckNode.innerHTML = "<input type='checkbox' />";
            tdSnNode.innerHTML = '<div style="white-space: nowrap"></div>';
            $(trHeadersNode).append(thSnNode);
            $(trHeadersNode).append(thCheckNode);
            $(trDataNode).append(tdSnNode);
            $(trDataNode).append(tdCheckNode);

            var checkObj = $(trHeadersNode).find("input[type='checkbox']");
            var bindingCheckEventObj = {
                handleEvent: function (e) {
                    this.tableClassObj.CheckAllRow();
                },
                tableClassObj: this,
            };
            $(checkObj)[0].addEventListener("click", bindingCheckEventObj, false);

            for (var i = 0; i < lsItems.length; i++) {
                var thNode = document.createElement("th");
                var tdNode = document.createElement("td");
                var keys = Object.keys(lsItems[i]);
                var bAddSortableIcon = false;
                var groupName = this.GetGroupNameByCellIndex(i + this.ReservedColNums);
                if (!checkIsEmpty(groupName)) {
                    thNode.setAttribute("groups", groupName);
                    tdNode.setAttribute("groups", groupName);
                }
                // todo: add thNode style "border-right: 1px solid #000000" when group change
                var columnName = "";
                for (var j = 0; j < keys.length; j++) {
                    var attrName = keys[j];
                    var attrVal = lsItems[i][attrName];
                    if (i==0 && j == 0) {
                        tdNode.setAttribute("id", "pivot_" + $(containObj).attr("id"));
                    }
                    if (attrName == "header_text") {
                        thNode.innerHTML = attrVal;
                    }
					/*
                    else if (attrName == "name") {
                        columnName = attrVal;
                    }
					*/
                    else if (attrName == "text") {
                        tdNode.innerHTML = attrVal;
                    }
                    else if (attrName.indexOf("data") >= 0 || attrName.indexOf("_format") >= 0 || attrName.indexOf("condition_statement") >= 0 || attrName.indexOf("time_offset") >= 0) {
                        continue;
                    }
                    else {
                        //var attrObj = document.createAttribute(attrName);
                        //attrObj.value = lsItems[i][attrName];
                        tdNode.setAttribute(attrName, lsItems[i][attrName]);
                        thNode.setAttribute(attrName, lsItems[i][attrName]);
                        if (attrName == "class" && attrVal.indexOf("sortable") >= 0) {
                            bAddSortableIcon = true;
                            $(tdNode).removeClass("sortable");
                        }
                        else if (attrName == "name")
                            columnName = attrVal;
                    }
                }
                this.ColumnNameList.push(columnName);
                if (bAddSortableIcon) {
                    var bindingSortEventObj = {
                        handleEvent: function (e) {
                            if (this.tableClassObj.IsSorting)
                                return;

                            this.tableClassObj.IsSorting = true;
                            var bCanBlockUi = !checkIsEmpty($.blockUI) && !checkIsEmpty($.unblockUI);
                            if (bCanBlockUi)
                                $.blockUI({ message: "<span style='font-size: 20px'>Sorting...</span>" });

                            var _this = this;
                            setTimeout(function () {
                                _this.tableClassObj.SortData(_this.colObj);
                                if (bCanBlockUi)
                                    $.unblockUI();
                                _this.tableClassObj.IsSorting = false;
                            }, 1000);
                        },
                        tableClassObj: this,
                        colObj: $(thNode)
                    };
                    thNode.addEventListener("click", bindingSortEventObj, false);
                    thNode.innerHTML += '<img onmouseover="" class="hide" src="/images/sort_az.png" style="width:10px;height:10px;" />';
                }
                $(trHeadersNode).append(thNode);
                $(trDataNode).append(tdNode);
            }
        }
        if (typeof (parameters["unikeys"]) != "undefined") {
            this.SetUniqueId(parameters["unikeys"]);
        }
    }

    //$(theadNode).append(trTitleNode);
    $(theadNode).append(trGroupHeadersNode);
    $(theadNode).append(trHeadersNode);
    $(tbodyNode).append(trDataNode);
    $(tableNode).append(theadNode);
    $(tableNode).append(tbodyNode);

    this.SetCounter(0);
    this.SetSelCounter(0);
};

JoyTable.prototype.TableAutoInitial = function(refData) {
	var bDetectValueType = true;
	var tmpConfig = {};
	if (checkIsEmpty(this.Configurations) || checkIsEmpty(this.Configurations.columns)) { // auto initial
		var id = this.TableObject.attr("id");
		tmpConfig["list_title"] = { 
			text: id, 
			style: "padding: 3px 5px" 
		};
		tmpConfig["list_body"] = { 
			style: "overflow: auto; padding: 0px; height:100%" 
		};
		tmpConfig["table"] = {
		    class: "table table-margin-bottom table-bordered table-hover table-striped small_font",// table-fixed-header ",
			style: "border-style: groove; border-color: transparent",
			show_sn_column: true
		};
		if (!checkIsEmpty(refData)) {
			var tmpAllCols = [];
			var refRecord = refData[0];
			var objKeys = Object.keys(refRecord);
			for (var i=0; i<objKeys.length; i++) {
				var key = objKeys[i];
				var headerText = key.replace(new RegExp("_", "g"), " ").toUpperCase();
				var tmpCol = {
					header_text: headerText,
					name: key,
					data: key,
					style: "text-align:center",
				};
				
				if (bDetectValueType) {
					// auto detect value type and attach
					var val = refRecord[key];
					if (checkIsDateString(val)) {
						//var tmpDate = NewUtcDate(val).format("yyyy-MM-dd hh:mm:ss");
						tmpCol["data_type"] = "Date";
						tmpCol["time_format"] = "yyyy-MM-dd hh:mm:ss";
						tmpCol["time_offset"] = 0;
						//tmpCol["class"] = "date_col";
					}
				}
				tmpAllCols.push(tmpCol);
			}
			if (!checkIsEmpty(tmpConfig)) {
				tmpConfig["columns"] = tmpAllCols;
			}
		}
		//this.Configurations = tmpConfig;
		this.TableInitial(this.RootObject, tmpConfig);
	}
}

// sort table data by header column object or column name
JoyTable.prototype.SortData = function SortData(headerColObj, colName) {
    lsData = this.DataSource;
    if (lsData.length <= 0) {
        return;
    }
    
    
    headerCol = headerColObj;

	if (checkIsEmpty(headerCol) && !checkIsEmpty(colName)) {
		var tmpHeaders = this.TableHeaderObject.find("[name=" + colName + "]");
		if (!checkIsEmpty(tmpHeaders))
		    headerCol = $(tmpHeaders[0]);
	}
	if (checkIsEmpty(headerCol))
		return;
	var thisSortIcon = headerCol.children("img");
	if (thisSortIcon.length <= 0) {
	    return;
	}
	var thisSortDesc = thisSortIcon.attr("src").indexOf("sort_za") >= 0? true: false; // current sorting state
	var newSortDesc = !thisSortDesc;
	var thisShowSnCol = headerColObj.attr("name").indexOf("candidate") >= 0 ? false : true;
    {
        var params = [];
        params.push(headerCol.find("td"));
        params.push(headerCol[0].cellIndex);

	    lsData.sort(this.SortObjByOutput(params, !newSortDesc, function (a) {
				if (typeof(a) == "boolean")
					return a;
				else if (typeof(a) == "number")
					return a;
				else if (String.isNullOrWhiteSpace(a))
					return "";
				return a.toString().toUpperCase();
			}));
		
		this.Clear();

		if (this.Events.PrivateAddRow != null && typeof (window[this.Events.PrivateAddRow]) === "function") {
		    for (var i = 0; i < lsData.length; i++)
		        window[this.Events.PrivateAddRow](lsData[i], true);
		}
		else {
		    //this.WriteRow(lsData, "add");
		    this.AddRows(lsData);
		}
		this.FinishAdd(thisShowSnCol);
	}
	
	// update sort icon
	if (newSortDesc) {
		thisSortIcon.attr("src", "/images/sort_za.png");
		thisSortIcon.removeClass("hide");
	}
	else {
		thisSortIcon.attr("src", "/images/sort_az.png");
		thisSortIcon.removeClass("hide");
	}

}

// sort list object by key
// field: key of object
// reverse: true: ascending
// premier: pre-process function before compare value
JoyTable.prototype.SortObjBy = function SortObjBy(field, reverse, preprocessFunc) {

    var getVal = preprocessFunc ?
			function(data) {
				if (field.indexOf(".") >= 0) {
					var objPaths = field.split(".");
					var cmd = "data";
					for (var i=0; i<objPaths.length; i++) {
						cmd += "['" + objPaths[i] + "']";
						if (eval(cmd + "==undefined"))
							return "";
					}
					return eval("preprocessFunc(" + cmd + ")");
				}
				else
				    return preprocessFunc(data[field]);
			} : 
			function (data) {
				if (field.indexOf(".") >= 0) {
					var objPaths = field.split(".");
					var cmd = "data";
					for (var i=0; i<objPaths.length; i++) {
						cmd += "['" + objPaths[i] + "']";
						if (eval(cmd + "==undefined"))
							return "";
					}
					return eval(cmd);
				}
				else
				    return data[field];
			};

	reverse = [-1, 1][+!!reverse];

	return function (a, b) {
	    return a = getVal(a), b = getVal(b), reverse * ((a > b) - (b > a));
	} 
}

//JoyTable.prototype.SortObjBy2 = function SortObjBy2(key, keyParam, reverse, preprocessFunc) {
//    var bKeyIsFunc = checkIsFunction(key);
//    var getVal;
//    if (bKeyIsFunc) {
//        var cmd = "window[key](data, " + keyParam + ")]"
//        getVal = preprocessFunc ?
//            function (data) {
//                preprocessFunc(eval(cmd))
//            } :
//            function (data) {
//                eval(key)
//            };
//    }
//    else {
//        getVal = preprocessFunc ?
//			    function (data) {
//			        if (key.indexOf(".") >= 0) {
//			            var objPaths = key.split(".");
//			            var cmd = "data";
//			            for (var i = 0; i < objPaths.length; i++) {
//			                cmd += "['" + objPaths[i] + "']";
//			                if (eval(cmd + "==undefined"))
//			                    return "";
//			            }
//			            return eval("preprocessFunc(" + cmd + ")");
//			        }
//			        else
//			            return preprocessFunc(data[key]);
//			    } :
//			    function (data) {
//			        if (key.indexOf(".") >= 0) {
//			            var objPaths = key.split(".");
//			            var cmd = "data";
//			            for (var i = 0; i < objPaths.length; i++) {
//			                cmd += "['" + objPaths[i] + "']";
//			                if (eval(cmd + "==undefined"))
//			                    return "";
//			            }
//			            return eval(cmd);
//			        }
//			        else
//			            return data[key];
//			    };

//    }

//    reverse = [-1, 1][+!!reverse];

//    return function (a, b) {
//        return a = getVal(a), b = getVal(b), reverse * ((a > b) - (b > a));
//    }
//}

// sort list object by table output content
JoyTable.prototype.SortObjByOutput = function SortObjByOutput(params, reverse, preprocessFunc) {
    var _this = this;
    var getVal = preprocessFunc ? function (data) {
        return preprocessFunc(_this.GetOutputContent(params[0], params[1], data, false));
    } : function (data) {
        return _this.GetOutputContent(params[0], params[1], data, false);
    };

    reverse = [-1, 1][+!!reverse];

    return function (a, b) {
        return a = getVal(a), b = getVal(b), reverse * ((a > b) - (b > a));
    }
}

// [deprecated] old function. not fix yet. 
JoyTable.prototype.ChangeColumnOrder = function ChangeColumnOrder(bNormalOrder) {
	var findKey = bNormalOrder? "src_": "sw_";
	var lsTagName = [".list_header th", ".list_data td"];
	for (var m=0; m<lsTagName.length; m++) {
		var allColObjs = $(this.TableObject).find(lsTagName[m]);
		var refColObj = null;
		var refColObjIdx = -1;
		for (var i=0; i<allColObjs.length; i++) {
			var thisColObj = $(allColObjs[i]);
			var thisColName = thisColObj.attr("name");
			if (String.isNullOrWhiteSpace(thisColName))
				continue;
			if (thisColName == "check_row") {
				refColObj = thisColObj;
				refColObjIdx = i;
			}
			else if (thisColName.indexOf(findKey) >= 0) {
				if (i == refColObjIdx + 1) // no need move
					break;
					
				// do move
				$(thisColObj).insertAfter($(refColObj));
				// update ref obj & index
				refColObjIdx++;// = i;
				refColObj = thisColObj;
			}
		}
	}
}

// set record counter of table
JoyTable.prototype.SetCounter = function SetCounter(counter) {
    var labelObj = this.RootObject.find("span[name='table_counter']");
    if (checkIsEmpty(labelObj))
        return;
	labelObj.text("Total record(s): " + counter);
}

// set selected record counter of table
JoyTable.prototype.SetSelCounter = function SetSelCounter(counter) {
    var labelObj = this.RootObject.find("span[name='table_sel_counter']");
	if (checkIsEmpty(labelObj))
	    return;
	if (this.RowSelectable)
		labelObj.text(". Selected record(s): " + counter);
	else
		labelObj.text("");
}

// set title of table
JoyTable.prototype.SetTitle = function SetTitle(title) {
    var labelObj = this.RootObject.find("span[name='table_title']");
    if (checkIsEmpty(labelObj))
        return;
	labelObj.text(title);
}

// set unique id of table. also set in TableInitial()
JoyTable.prototype.SetUniqueId = function SetUniqueId(lsUniKeys) {
	if (checkIsEmpty(this.TableObject)) {
		console.debug("Invalid table object");
		return false;
	}
	
	var strKeys = "";
	if (typeof(lsUniKeys) == "object")
		strKeys = lsUniKeys.join();
	else
		strKeys = lsUniKeys;
	this.Unikeys = lsUniKeys;
	$(this.TableObject).attr("unique-keys", strKeys);
	return true;
}

// get unitue id of table
JoyTable.prototype.GetUnitueId = function GetUniqueId() {
    //var lsUniKeys = $(this.TableObject).attr("unique-keys").split(",");
    return this.Unikeys;
}

// get unique id in table based on data object
// data: single data from binding data source
JoyTable.prototype.GetUniqueIdByData = function GetUniqueIdByData(data) {
	if (checkIsEmpty(this.TableObject)) {
		console.debug("Invalid table object");
		return;
	}
	if (checkIsEmpty(data)) {
		console.debug("Invalid data");
		return;
	}
	var lsUniKeys = this.GetUnitueId();
	var uniqueId = "";
	if (typeof(lsUniKeys) == "string") {
		var value = getObjectValueByKeyPath(data, lsUniKeys);
		if (checkIsEmpty(value)) {
			console.debug("Invalid unique key: " + lsUniKeys);
			return;
		}
		uniqueId = value + "_" + this.TableObject.attr("id");
	}
	else if (typeof(lsUniKeys) == "object") {
		if (checkIsEmpty(lsUniKeys)) {
			console.debug("No unique key");
			return;
		}
		for (var i=0; i<lsUniKeys.length; i++) {
			var value = getObjectValueByKeyPath(data, lsUniKeys[i]);
			if (checkIsEmpty(value)) {
				console.debug("Invalid unique key: " + lsUniKeys[i]);
				return;
			}
			uniqueId += value + "_";
		}
		//uniqueId = uniqueId.substring(0, uniqueId.length); // remove last _
		uniqueId += this.TableObject.attr("id");
	}
	return uniqueId;
}

// get binding data object by row object
JoyTable.prototype.GetDataByRow = function GetDataByRow(rowObj) {
    if (checkIsEmpty(this.DataSource))
        return null;
    if (checkIsEmpty($(rowObj).attr("id")))
        return null;
    var uniqueId = $(rowObj).attr("id");
    return this.GetDataByUniqueId(uniqueId);
}

// get binding data by unique id string
JoyTable.prototype.GetDataByUniqueId = function GetDataByUniqueId(uniqueId) {
    if (checkIsEmpty(this.DataSource))
        return null;
    var lsKeyVals = uniqueId.split("_");
    return this.GetDataByUnikeyVal(lsKeyVals);
}

// get binding data object by list of unique id
JoyTable.prototype.GetDataByUnikeyVal = function GetDataByUnikeyVal(lsKeyVals) {//sourceTypeId, matchId) {
    var lsUniKeys = this.GetUnitueId();
    if (checkIsEmpty(this.DataSource) || checkIsEmpty(lsUniKeys) || checkIsEmpty(lsKeyVals))
        return null;
    var dataIdx = this.GetDataIndexByUnikeyVal(lsKeyVals);
    if (dataIdx == -1)
        return null;
    return this.DataSource[dataIdx];
}

// get index of binding data object by list of unique id
JoyTable.prototype.GetDataIndexByUnikeyVal = function GetDataIndexByUnikeyVal(lsKeyVals) {//sourceTypeId, matchId) {
    var lsUniKeys = this.GetUnitueId();
    if (checkIsEmpty(this.DataSource) || checkIsEmpty(lsUniKeys) || checkIsEmpty(lsKeyVals))
        return -1;
    var bFound = false;
    for (var i = 0; i < this.DataSource.length; i++) {
        for (var j = 0; j < lsUniKeys.length; j++) {
            var value = getObjectValueByKeyPath(this.DataSource[i], lsUniKeys[j]);
            if (value.toString() != lsKeyVals[j].toString()) {
                break;
            }
            if (j == lsUniKeys.length - 1)
                bFound = true;
        }
        if (!bFound)
            continue;
        return i;
    }
    return -1;
}

// get focus row object
JoyTable.prototype.GetFocusRow = function GetFocusRow() {
	var highlightObj = this.TableObject.find("tr.highlight_text");
	if (highlightObj != null) {
		return highlightObj;
	}
	return null;
}

// get binding data object of focus row
JoyTable.prototype.GetFocusData = function GetFocusData() {
    var lsUniKeys = this.GetUnitueId();
	var highlightObj = this.GetFocusRow(this.TableObject);
	if (highlightObj != null) {
	    return this.GetDataByRow(highlightObj);
		//var uniqueId = highlightObj.attr("id");
		//if (!checkIsEmpty(uniqueId)) {
		//    return this.GetDataByUniqueId(uniqueId);
		//}
	}
	return null;
}

// get checked row objects
JoyTable.prototype.GetCheckedRows = function GetCheckedRows() {
    var result = [];
    var cbObjs = this.TableObject.find("tbody [name='check_row'] [type='checkbox']");
    for (var i = 0; i < cbObjs.length; i++) {
        var cbObj = $(cbObjs[i]);
        if (cbObj.prop("checked")) {
            var uniqueId = cbObj.parents("tr").attr("id");
            if (!checkIsEmpty(uniqueId))
                //result.push(cbObj.parents("tr").attr("id"));
                result.push(cbObj.parents("tr"));
        }
    }
    return result;
}

// get binding data objects of checked rows
JoyTable.prototype.GetCheckedData = function GetCheckedData() {
    var result = [];
    var cbObjs = this.TableObject.find("tbody [name='check_row'] [type='checkbox']");
    for (var i = 0; i < cbObjs.length; i++) {
        var cbObj = $(cbObjs[i]);
        if (cbObj.prop("checked")) {
            var uniqueId = cbObj.parents("tr").attr("id");
            if (!checkIsEmpty(uniqueId))
                result.push(this.GetDataByUniqueId(uniqueId));
        }
    }
    return result;
}

// check table contain data row by unique id string
JoyTable.prototype.HasDataByUniqueId = function HasDataByUniqueId(uniqueId) {
	if (checkIsEmpty(uniqueId))
		return false;
		
	var rowObjs = $(this.TableObject).find("tr[id='" + uniqueId + "']");
	if (rowObjs.length > 0)
		return true;
	return false;
}

// update rows to table and update binding data
JoyTable.prototype.UpdateRows = function UpdateRows(lsData, bFirstRowClick) {
    var tBeginLayout = new Date();
    var lsResult = [];
	if (checkIsEmpty(this.Unikeys)) {
		this.AutoUnikeys = true;
		this.Unikeys = "_joytable_autokey_";
	}
    //var lsUniKeys = this.GetUnitueId();
    for (var i = 0; lsData != null && i < lsData.length; i++) {
        if (this.AutoUnikeys)
			lsData[i]["_joytable_autokey_"] = "_joytable_autokey_" + ((new Date()).getTime()).toString() + "_" + i;
		var result = this.WriteRow(lsData[i], "update", false, true);
        lsResult.push(result);
    }
    //this.DataSource = lsData;
    this.FinishAdd(this.SnColVisible, bFirstRowClick);
	var tSpentTime = (new Date() - tBeginLayout);
	if (this.Debug)
		console.log(this.TableObject.attr("id") + " Draw table spent:" + tSpentTime + "ms");
}

// add rows to table and update binding data
JoyTable.prototype.AddRows = function AddRows(lsData, bFirstRowClick) {
	if (checkIsEmpty(this.Configurations) || checkIsEmpty(this.Configurations.columns)) {
		this.TableAutoInitial(lsData);
	}
	var tBeginLayout = new Date();
    var lsResult = [];
	if (checkIsEmpty(this.Unikeys)) {
		this.AutoUnikeys = true;
		this.Unikeys = "_joytable_autokey_";
	}
    //var lsUniKeys = this.GetUnitueId();
    for (var i = 0; lsData != null && i < lsData.length; i++) {
		if (this.AutoUnikeys)
			lsData[i]["_joytable_autokey_"] = "_joytable_autokey_" + ((new Date()).getTime()).toString() + "_" + i;
        var result = this.WriteRow(lsData[i], "add", false, true);
        lsResult.push(result);
    }
    this.DataSource = lsData;
    //this.SnColVisible = bShowSnCol;
    this.FinishAdd(this.SnColVisible, bFirstRowClick);
	var tSpentTime = (new Date() - tBeginLayout);
	if (this.Debug)
		console.log(this.TableObject.attr("id") + " Draw table spent:" + tSpentTime + "ms");
}

// write (new/update) a row into table (internal use)
// data: single data from binding data source
JoyTable.prototype.WriteRow = function WriteRow(data, mode, bAutoClick, bNotFinish) {
	var result = { result: false, msg: ""};
	var bAddRow = mode.toLowerCase() == "add";
	if (bAutoClick == undefined)
		bAutoClick = false;
		
	if (checkIsEmpty(this.TableObject)) {
		console.debug("Invalid table object");
		result.msg = "Invalid table object";
		return result;
	}
	if (checkIsEmpty(data)) {
		console.debug("Invalid data");
		result.msg = "Invalid data";
		return result;
	}
	var lsUniKeys = this.GetUnitueId();
	var uniqueId = this.GetUniqueIdByData(data);
	if (String.isNullOrWhiteSpace(uniqueId)) {
		console.debug("Unique key unknown");
		result.msg = "Unique key unknown";
		return result;
	}
	var bExisted = this.HasDataByUniqueId(uniqueId);
	if (bAddRow && bExisted) {
		result.msg = "Duplicated";
		return result;
	}
	
	var columnObjs;
	if (bAddRow) {
	    var newRowObj = this.TableAddRowElement(this.TableObject);
		newRowObj.attr("id", uniqueId);
		columnObjs = newRowObj.find("td");
	}
	else {
	    var replaceIndex = this.GetDataIndexByUnikeyVal(uniqueId.split("_"));
	    this.DataSource[replaceIndex] = data;
		columnObjs = $("#" + uniqueId).find("td");
		result.msg = "Target row not found";
		if (checkIsEmpty(columnObjs))
			return result;
	}
	
	for (var i = this.ReservedColNums; i < columnObjs.length; i++) { // reserve 0: serial_number, 1: check_row
	    var currentGroup = this.GetGroupNameByCellIndex(i);
	    //if (!checkIsEmpty(this.TableGroupHeaderObject) && this.GroupNameList.length > 0) {
	    //    currentGroup = this.GroupNameList[i - this.ReservedColNums];
	    //    $(columnObjs[i]).attr("groups", currentGroup);
	    //}
	    //this.SetColumnContent($(columnObjs[i]), data);
	    this.SetColumnContent(columnObjs, i, data);
	}
	if (bAutoClick)
		$("#" + uniqueId).click();
	
	if (!bNotFinish)
	    this.FinishAdd(false, false);
	result.result = true;
	return result;
}

// get group name by cell index
JoyTable.prototype.GetGroupNameByCellIndex = function (cellIndex) {
    var result = "";
    if (cellIndex == 0)
        result = "SerialNumber";
    else if (cellIndex == 1)
        result = "Checkbox";
    else if (cellIndex < 0)
        result = "";
    else if (!checkIsEmpty(this.TableGroupHeaderObject) && this.GroupNameList.length > 0) {
        result = this.GroupNameList[cellIndex - this.ReservedColNums];
    }
    return result;
}

// get group name by column object
JoyTable.prototype.GetGroupNameByColumnObject = function (columnObj) {
    if (checkIsEmpty(columnObj))
        return "";
    var cellIndex = $(columnObj)[0].cellIndex;
    return this.GetGroupNameByCellIndex(cellIndex);
}

// generate column content by configuration
// data: single data from binding data source
//JoyTable.prototype.SetColumnContent = function SetColumnContent(columnObj, data) {
JoyTable.prototype.SetColumnContent = function SetColumnContent(columnObjs, columnIdx, data) {
    // tobe finish: columnObj.attr("statement");
    var columnObj = $(columnObjs[columnIdx]);
    var columnConfigObj = this.Configurations.columns[columnIdx - this.ReservedColNums];

    var tdContent = this.GetOutputContent(columnObjs, columnIdx, data, false);
    //if (checkIsEmpty(data["outputContent"]))
    //    data["outputContent"] = {}
    //data["outputContent"][columnConfigObj.name] = tdContent;
    columnObj.html(tdContent);

    var tdTitleContent = this.GetOutputContent(columnObjs, columnIdx, data, true);
    if (!checkIsEmpty(tdTitleContent))
        columnObj.attr("title", tdTitleContent);
    return;

    //var dataSet = columnConfigObj["dataset"]; // list of object. member: dataKey, dataType, dataFormat
    //var titleDataKey = columnConfigObj["title_data"];

    //if (checkIsEmpty(dataSet)) {
    //    dataSet = [];
    //    var dataItem = {};
    //    dataItem["data"] = columnConfigObj["data"];
    //    dataItem["data_type"] = columnConfigObj["data_type"];
    //    dataItem["time_format"] = columnConfigObj["time_format"];
    //    dataItem["time_offset"] = columnConfigObj["time_offset"];
    //    dataItem["condition_statement"] = columnConfigObj["condition_statement"];
    //    dataSet.push(dataItem);
    //}
    //var embeddedContent = columnConfigObj["text"];
    //var bAutoEmbeddedContent = false;
    //if (checkIsEmpty(embeddedContent)) { // gen pattern if no embedded content
    //    bAutoEmbeddedContent = true;
    //    embeddedContent = "";
    //    for (var i = 0; i < dataSet.length; i++) {
    //        embeddedContent += "${" + i + "}";
    //        if (i != dataSet.length - 1)
    //            embeddedContent += ", ";
    //    }
    //}
    //else {
    //    // do nothing
    //}

    //var finalOutputContent = embeddedContent;
    //var enumArrayIndex = -1;
    //var testAnyPlaceholderPattern = /\${[0-9]+}/; // ${n}  n>=0
    //for (var i = 0; i < dataSet.length; i++) {
    //    var displayContent = "";
    //    var dataKey = dataSet[i]["data"];
    //    var dataType = dataSet[i]["data_type"];
    //    var negativeDataKey = dataSet[i]["negative_data"];
    //    var dataIsText = dataSet[i]["data_is_text"];
    //    var dataType = dataSet[i]["data_type"];
    //    var timeFormat = dataSet[i]["time_format"];
    //    var timeOffset = dataSet[i]["time_offset"];
    //    var boolFormat = dataSet[i]["bool_format"];
    //    var conditionStatement = dataSet[i]["condition_statement"];

    //    //if (checkIsEmpty(dataKey)) {
    //    //    finalOutputContent = finalOutputContent.replace(new RegExp("\\$\\{" + i + "\\},?", "g"), "");
    //    //    continue;
    //    //}

    //    if (checkIsEmpty(dataIsText))
    //        dataIsText = false;
    //    //else {
    //    //    console.log('aa');
    //    //}

    //    // condition_statement
    //    var bConditionHasEnumArray = false;
    //    var conditionEnumArrayIndex = -1;
    //    var bConditionSatisfy = false;
    //    if (!checkIsEmpty(conditionStatement)) { // check condition satisfy if existed
    //        conditionStatement = conditionStatement.replace(/\$\{data\}/g, "data");
    //        var enumArrayKeywordIndex = conditionStatement.indexOf("[n]");
    //        if (enumArrayKeywordIndex >= 0) { // to handle if enum array existed
    //            bConditionHasEnumArray = true;
    //            try {
    //                var enumArrayName = conditionStatement.substr(0, enumArrayKeywordIndex);
    //                var enumArrayLength = eval("data." + enumArrayName).length;
    //                for (var j = 0; j < enumArrayLength; j++) {
    //                    var tmpStatement = conditionStatement.replace(/\[n\]/g, "[" + j + "]");
    //                    bConditionSatisfy = eval("data." + tmpStatement) == true;
    //                    if (bConditionSatisfy) {
    //                        conditionEnumArrayIndex = j;
    //                        break;
    //                    }
    //                }
    //            }
    //            catch (e) {
    //                console.error("condition_statement has error: " + conditionStatement);
    //            }
    //        }
    //        else { // to handle normal statement
    //            try {
    //                bConditionSatisfy = eval(conditionStatement) == true;
    //            }
    //            catch (e) {
    //                console.error("condition_statement has error: " + conditionStatement);
    //            }
    //        }
    //    }
    //    else
    //        bConditionSatisfy = true;

    //    var trgDataKey = bConditionSatisfy ? dataKey : negativeDataKey;
    //    if (dataIsText)
    //        displayContent = checkIsEmpty(trgDataKey) ? "" : trgDataKey;
    //    else if (checkIsEmpty(trgDataKey)) {
    //        displayContent = "";
    //    }
    //    else {
    //        enumArrayIndex = conditionEnumArrayIndex;
    //        if (bConditionHasEnumArray) {
    //            trgDataKey = trgDataKey.replace("[n]", "[" + conditionEnumArrayIndex + "]");
    //            if (titleDataKey != undefined)
    //                titleDataKey = titleDataKey.replace("[n]", "[" + conditionEnumArrayIndex + "]");
    //        }
    //        displayContent = getObjectValueByKeyPath(data, trgDataKey);
    //        if (displayContent == undefined)
    //            displayContent = "";
    //    }

    //    if (!checkIsEmpty(displayContent)) {
    //        if (dataType != undefined && data) {
    //            if (dataType == "Date" && timeFormat != undefined) {
    //                if (isNaN(timeOffset))
    //                    displayContent = NewUtcDate(displayContent).format(timeFormat);
    //                else
    //                    displayContent = NewUtcDate(displayContent).addHour(timeOffset).format(timeFormat);
    //            }
    //            else if (dataType == "Boolean" && boolFormat != undefined && Object.keys(boolFormat).length == 2) {
    //                displayContent = boolFormat[displayContent];
    //            }
    //        }
    //    }
    //    finalOutputContent = finalOutputContent.replace(new RegExp("\\$\\{" + i + "\\},?", "g"), displayContent);

    //}
    //columnObj.html(finalOutputContent);

	//if (titleDataKey != undefined) {
	//    columnObj.attr("title", getObjectValueByKeyPath(data, titleDataKey));
	//}
}

// generate column content by configuration
JoyTable.prototype.GetOutputContent = function GetOutputContent(columnObjs, columnIdx, data, isTitle) {
    var columnObj = $(columnObjs[columnIdx]);
    var columnConfigObj = this.Configurations.columns[columnIdx - this.ReservedColNums];

    var keyPrefix = isTitle ? "title_" : "";
    var dataSet = columnConfigObj[keyPrefix + "dataset"]; // list of object. member: dataKey, dataType, dataFormat
    if (checkIsEmpty(dataSet)) {
        dataSet = [];
        var dataItem = {};
        dataItem[keyPrefix + "data"] = columnConfigObj[keyPrefix + "data"];
        dataItem[keyPrefix + "data_type"] = columnConfigObj[keyPrefix + "data_type"];
        dataItem[keyPrefix + "time_format"] = columnConfigObj[keyPrefix + "time_format"];
        dataItem[keyPrefix + "time_offset"] = columnConfigObj[keyPrefix + "time_offset"];
        dataItem[keyPrefix + "condition_statement"] = columnConfigObj[keyPrefix + "condition_statement"];
        dataSet.push(dataItem);
    }
    var embeddedContent = columnConfigObj[keyPrefix + "text"];
    var bAutoEmbeddedContent = false;
    if (checkIsEmpty(embeddedContent)) { // gen pattern if no embedded content
        bAutoEmbeddedContent = true;
        embeddedContent = "";
        for (var i = 0; i < dataSet.length; i++) {
            embeddedContent += "${" + i + "}";
            if (i != dataSet.length - 1)
                embeddedContent += ", ";
        }
    }
    else {
        // do nothing
    }

    var finalOutputContent = embeddedContent;
    var enumArrayIndex = -1;
    var testAnyPlaceholderPattern = /\${[0-9]+}/; // ${n}  n>=0
    for (var i = 0; i < dataSet.length; i++) {
        var displayContent = "";
        var dataKey = dataSet[i][keyPrefix + "data"];
        var dataType = dataSet[i][keyPrefix + "data_type"];
        var negativeDataKey = dataSet[i][keyPrefix + "negative_data"];
        var dataIsText = dataSet[i][keyPrefix + "data_is_text"];
        var dataType = dataSet[i][keyPrefix + "data_type"];
        var timeFormat = dataSet[i][keyPrefix + "time_format"];
        var timeOffset = dataSet[i][keyPrefix + "time_offset"];
        var boolFormat = dataSet[i][keyPrefix + "bool_format"];
        var conditionStatement = dataSet[i][keyPrefix + "condition_statement"];

        //if (checkIsEmpty(dataKey)) {
        //    finalOutputContent = finalOutputContent.replace(new RegExp("\\$\\{" + i + "\\},?", "g"), "");
        //    continue;
        //}

        if (checkIsEmpty(dataIsText))
            dataIsText = false;

        // condition_statement
        var bConditionHasEnumArray = false;
        var conditionEnumArrayIndex = -1;
        var bConditionSatisfy = false;
        if (!checkIsEmpty(conditionStatement)) { // check condition satisfy if existed
            conditionStatement = conditionStatement.replace(/\$\{data\}/g, "data").trim();
            var enumArrayKeywordIndex = conditionStatement.indexOf("[n]");
            if (enumArrayKeywordIndex >= 0) { // to handle if enum array existed
                bConditionHasEnumArray = true;
				var notSign = conditionStatement[0] == "!"? "!": ""; // only for first character in overall condition statement
				if (notSign.length > 0) {
					conditionStatement = conditionStatement.substr(1);
					// remove the "not sign" if it is the first character
					// i will prepend the "not sign" to condition statement due to the statement need rebuild later
					// if won't remove "not sign". it should be rewrite
					//   statement without "not sign": "data." insert to statement[0]
					//   statement contain "not sign": "data." insert to statement[1]
				}
                try {
                    var enumArrayName = conditionStatement.substr(0, enumArrayKeywordIndex);
                    var enumArrayLength = eval(notSign + "data." + enumArrayName).length;
                    for (var j = 0; j < enumArrayLength; j++) {
                        var tmpStatement = conditionStatement.replace(/\[n\]/g, "[" + j + "]");
                        bConditionSatisfy = eval(notSign + "data." + tmpStatement) == true;
                        if (bConditionSatisfy) {
                            conditionEnumArrayIndex = j;
                            break;
                        }
                    }
                }
                catch (e) {
                    console.error(keyPrefix + "condition_statement has error: " + conditionStatement);
                }
            }
            else { // to handle normal statement
                try {
                    bConditionSatisfy = eval(conditionStatement) == true;
                }
                catch (e) {
                    console.error(keyPrefix + "condition_statement has error: " + conditionStatement);
                }
            }
        }
        else
            bConditionSatisfy = true;

        var trgDataKey = bConditionSatisfy ? dataKey : negativeDataKey;
        if (dataIsText)
            displayContent = checkIsEmpty(trgDataKey) ? "" : trgDataKey;
        else if (checkIsEmpty(trgDataKey)) {
            displayContent = "";
        }
        else {
            enumArrayIndex = conditionEnumArrayIndex;
            if (bConditionHasEnumArray) {
                trgDataKey = trgDataKey.replace("[n]", "[" + conditionEnumArrayIndex + "]");
            }
            displayContent = getObjectValueByKeyPath(data, trgDataKey);
            if (displayContent === undefined) // use "===" due to distinguish between null and undefined
                displayContent = "";
        }

        if (displayContent == null ||  // allow null due to some value is nullable
			!checkIsEmpty(displayContent)) {
            if (dataType != undefined && data) {
                if (displayContent != null && dataType == "Date" && timeFormat != undefined) {
                    if (isNaN(timeOffset))
                        displayContent = NewUtcDate(displayContent).format(timeFormat);
                    else
                        displayContent = NewUtcDate(displayContent).addHour(timeOffset).format(timeFormat);
                }
                else if (dataType == "Boolean" && boolFormat != undefined && Object.keys(boolFormat).length >= 2) {
                    displayContent = boolFormat[displayContent];
                }
            }
			if (!this.IsAllowShowingNull && displayContent == null)
				displayContent = "";
        }
        finalOutputContent = finalOutputContent.replace(new RegExp("\\$\\{" + i + "\\},?", "g"), displayContent);

    }
    //columnObj.html(finalOutputContent);
    return finalOutputContent;
}

// post process after finish add/update rows (internal use)
JoyTable.prototype.FinishAdd = function FinishAdd(bShowSnCol, bClickFirstRow) {
    var counter = 0;
    if (bShowSnCol == undefined)
        bShowSnCol = false;
    if (bClickFirstRow == undefined)
        bClickFirstRow = false;
    //if (bShowSnCol)
    //	counter = this.ShowSn(this.TableObject);
    counter = this.CountRow(bShowSnCol);

    var tableId = this.TableObject.attr("id");

    //if (!checkIsEmpty(this.TableObject.attr("class")) && this.TableObject.attr("class").indexOf("table-fixed-header") >= 0) {
    //    //if (this.TableObject.attr("id") == "list_match") {
    //    //this.FixHeader(this.TableObject);
    //    this.DoUpdateFixCell();
    //}

    if (this.Events.OnChanged != null && typeof (window[this.Events.OnChanged]) === "function")
        window[this.Events.OnChanged](this.TableObject);

    this.SetCounter(counter);
    this.SetSelCounter(0);

    if (bClickFirstRow) {
        var rowObjs = this.TableObject.find("tbody tr.list_data");
        if (!checkIsEmpty(rowObjs)) {
            for (var i = 0; i < rowObjs.length; i++) {
                if ($(rowObjs[i]).attr('class').indexOf("template") < 0) { // not template
                //if ($(rowObjs[i]).height() > 0) { // not hide
                    var rowInputObjs = $(rowObjs[i]).find("input");
                    if (!checkIsEmpty(!rowInputObjs))
                        $(rowInputObjs[0]).focus();
                    //this.ClickRow($(rowObjs[i]));
                    $(rowObjs[i]).click();
                    break;
                }
            }
        }
        //$($("#list_match tbody tr.list_data input")[1]).focus();
        //$($("#list_match tbody tr.list_data")[1]).click();
    }
    //$(window).resize();
    window.dispatchEvent(new Event('resize')); // to be fix
    //console.log('resize1');
    //*********  because of the time difference problem will cause header layout broken
    //*********  so here need to delay 1 sec to resize the header 
    setTimeout(function () { window.dispatchEvent(new Event('resize')) }, 1000);
    
    return counter;
}

// [deprecated] fix table header
JoyTable.prototype.FixHeader = function FixHeader() {
	//if (this.TableObject.attr("class").indexOf("table-fixed-header") < 0)
	//	return;
    var _this = this;
	$(this.TableObject).floatThead({
		scrollingTop: pageTop,
		useAbsolutePositioning: false,
		scrollContainer: function (_this) {
		    //return $table.closest("div").closest("div");
		    return _this.BodyRootObject;
		}
	});
	$(this.TableObject).floatThead("reflow");
}

// callback event when table scrolling (internal use)
JoyTable.prototype.OnTableScrolling = function OnTableScrolling(e) {
    //console.debug("scrolling x:" + this.BodyRootObject.scrollLeft() + " y:" + this.BodyRootObject.scrollTop());
    this.TableHeaderDivObject.offset({ left: -1 * e.currentTarget.scrollLeft });
}

// callback event when table resizing (internal use)
JoyTable.prototype.OnResizing = function OnResizing(e) {
    //console.debug("Resizing");
    if (!checkIsEmpty(this.TableObject.attr("class")) && this.TableObject.attr("class").indexOf("table-fixed-header") >= 0) {
        //if (this.TableObject.attr("id") == "list_match") {
        //this.FixHeader(this.TableObject);
        this.DoUpdateFixCell();
        this.TableHeaderDivObject.css('left', this.ScrollOffset);
    }
    else
        this.UnDoFixCell();
}

// fix table header
JoyTable.prototype.DoFixCell = function DoFixCell() {
    var oriTheadObj = this.TableObject.find("thead");
    var oriTheadHeight = oriTheadObj.height();
    var oriTheadWidth = oriTheadObj.width();

    if (this.TableHeaderDivObject != null) {
        return this.DoUpdateFixCell();
    }
    

    // initial new header container
    var newHeaderDivNode = document.createElement("div");
    var newHeaderTableNode = document.createElement("table");
    newHeaderDivNode.setAttribute("style", "position:fixed; z-index:1;");
    $(newHeaderDivNode).css("width", parseInt($(this.TableObject).css("width")) +
                                    parseInt($(this.TableObject).css("borderLeftWidth")) +
                                    parseInt($(this.TableObject).css("borderRightWidth")));
    $(newHeaderDivNode).css("height", oriTheadHeight +
                                    parseInt($(this.TableObject).css("borderTopWidth")) +
                                    parseInt($(this.TableObject).css("borderBottomWidth")));
    $(newHeaderTableNode).attr("style", $(this.TableObject).attr("style"));
    $(newHeaderTableNode).attr("class", $(this.TableObject).attr("class"));
    $(newHeaderTableNode).css("width", $(this.TableObject).css("width"));
    $(newHeaderTableNode).css("height", $(this.TableObject).css("height"));
    $(newHeaderDivNode).append($(newHeaderTableNode));
    this.TableHeaderDivObject = $(newHeaderDivNode);

    // initial fake header container
    var fakeHeaderTheadNode = document.createElement("thead");
    var fakeHeaderTrNode = document.createElement("tr");
    this.TableFakeHeaderTheadObject = fakeHeaderTheadNode;
    $(fakeHeaderTheadNode).append($(fakeHeaderTrNode));

    // set fake header content
    var oriTheadNodes = this.TableHeaderObject.find("th");
    for (var i = 0; i < oriTheadNodes.length; i++) {
        var oriTheadNode = oriTheadNodes[i];
        // force set current width/height to ori th
        var cellWidth = $(oriTheadNode).outerWidth(); // dom offsetWidth
        var cellHeight = $(oriTheadNode).outerHeight(); // dom offsetHeight
        $(oriTheadNode).css("width", cellWidth);
        $(oriTheadNode).css("height", cellHeight);

        // create fake th
        var fakeHeaderThNode = $(oriTheadNode).clone();
        //var fakeHeaderThNode = document.createElement("th");
        //fakeHeaderThNode.innerHTML = "&nbsp;";
        //$(fakeHeaderThNode).attr("style", $(oriTheadNode).attr("style"));
        //$(fakeHeaderThNode).attr("groups", $(oriTheadNode).attr("groups"));
        $(fakeHeaderThNode).css("height", oriTheadHeight);
        $(fakeHeaderTrNode).append($(fakeHeaderThNode));
    }

    // add new header container (empty) to ui
    $(this.BodyRootObject).prepend(this.TableHeaderDivObject); //$(newHeaderDivNode)
    
    // move ori header to new container
    oriTheadObj.prependTo($(newHeaderTableNode));


    // add fake header to table
    $(this.TableObject).prepend($(fakeHeaderTheadNode));

    var domObj = this.BodyRootObject[0];
    domObj.addEventListener("scroll", this._bindingScrollingEventObj, false);
}

// un-fix table header
JoyTable.prototype.UnDoFixCell = function UnDoFixCell() {
    if (this.TableHeaderDivObject == null)
        return;
    this.ScrollOffset = this.TableHeaderDivObject.css('left');
    var tableOriHeaderTheadObject = this.TableHeaderDivObject.find("thead")[0];
    this.TableFakeHeaderTheadObject.remove();
    this.TableFakeHeaderTheadObject = null;
    $(tableOriHeaderTheadObject).prependTo(this.TableObject);
    this.TableHeaderDivObject.remove();
    this.TableHeaderDivObject = null;
    var domObj = this.BodyRootObject[0];
    domObj.removeEventListener("scroll", this._bindingScrollingEventObj, false);
}

// relayout fixed table header
JoyTable.prototype.DoUpdateFixCell = function DoUpdateFixCell() {
    this.UnDoFixCell();
    this.DoFixCell();
}

// show/hide column
JoyTable.prototype.ShowHideColumn = function ShowHideColumn(colName, bShowCol) {
    if (!checkIsEmpty(this.Configurations["groups"])) {
        var cellIndexes = ArrayFind(this.ColumnNameList, colName);  // this.ColumnNameList.find(colName);
        for (var i = 0; i < cellIndexes.length; i++) {
            var currentGroup = this.GetGroupNameByCellIndex(cellIndexes[i]);
            this.TableGroupHeaderObject.each(function () {
                var colSpan = parseInt($(this).attr("colspan"));
                if (bShowCol)
                    colSpan++;
                else
                    colSpan--;
                $(this).attr("colspan", colSpan);
            });
        }
    }

    this.TableHeaderObject.find("[name=" + colName + "]").each(function () {
        if (bShowCol)
            $(this).removeClass("hide");
        else
            $(this).addClass("hide");
    });

    // show/hide th/td column 
    this.TableObject.find("[name=" + colName + "]").each(function () {
        if (bShowCol)
            $(this).removeClass("hide");
        else
            $(this).addClass("hide");
    });
    //$(window).resize();
    window.dispatchEvent(new Event('resize'));
}

// show/ hide group column
JoyTable.prototype.ShowHideGroups = function ShowHideGroups(groupName, bShowCol) {
    // show/hide thead's th group
    this.TableTheadObject.find("[name=" + groupName + "],[groups=" + groupName + "]").each(function () {
        if (bShowCol)
            $(this).removeClass("hide");
        else
            $(this).addClass("hide");
    });

    // show/hide th/td group column
    this.TableObject.find("[groups=" + groupName + "]").each(function () {
        if (bShowCol)
            $(this).removeClass("hide");
        else
            $(this).addClass("hide");
    });
    //$(window).resize();
    window.dispatchEvent(new Event('resize'));
}

// click a row of table
JoyTable.prototype.ClickRow = function ClickRow(rowDomObj) {
    var highlightRow = this.GetFocusRow(this.TableObject);
    if (highlightRow != null) {
        highlightRow.removeClass("highlight_text");
    }
    var rowObj = $(rowDomObj);
    rowObj.addClass("highlight_text");
    if (this.Events.OnRowClicked != null && typeof (window[this.Events.OnRowClicked]) === "function")
        window[this.Events.OnRowClicked](rowDomObj);
}

// check all rows of table
JoyTable.prototype.CheckAllRow = function CheckAllRow(checkStatus) {
    var cbAllObj = this.TableObject.find("[name='check_row'] [type='checkbox']");
    if (!checkIsEmpty(cbAllObj))
        cbAllObj = $(cbAllObj[0])
    else {
        console.warn("Check all element not found");
        return;
    }
    var setValue = true;
    if (checkIsEmpty(checkStatus))
        setValue = cbAllObj.prop("checked");
    else {
        setValue = checkStatus;
        cbAllObj.prop("checked", checkStatus);
    }

    var trRowObjs = this.TableObject.find("tbody tr");
    for (var i = 0; i < trRowObjs.length; i++) {
        var trRowObj = $(trRowObjs[i]);
        if (trRowObj.attr("class").indexOf("template") >= 0)
            continue;
        var lastObj = (i == trRowObjs.length - 1);
        this.CheckRow(trRowObj, setValue, lastObj);
    }

    //var cbObjs = this.TableObject.find("tbody [name='check_row'] [type='checkbox']");
    //for (var i = 0; i < cbObjs.length; i++) {
    //    var cbObj = cbObjs[i];
    //    var trRowObj = $(cbObj).parents("tr");
    //    if (trRowObj.attr("class").indexOf("template") >= 0)
    //        continue;
    //    var lastObj = (i == cbObjs.length - 1);
    //    this.CheckRow(trRowObj, setValue, lastObj);
    //}
}

// check a row of table
JoyTable.prototype.CheckRow = function CheckRow(rowDomObj, checkStatus, finishCheck) {
    var rowObj = $(rowDomObj);
    var cbObj = $(rowDomObj).find("[name='check_row'] [type='checkbox']");
    var uniqueId = rowObj.attr("id");
    var setValue = true;// = cbObj.prop("checked");
    if (checkIsEmpty(finishCheck))
        finishCheck = true;

    if (checkIsEmpty(checkStatus)) {
        setValue = cbObj.prop("checked");
    }
    else {
        setValue = checkStatus;
        cbObj.prop("checked", checkStatus);
    }

    if (setValue) {
        rowObj.addClass("highlight_background");
    }
    else {
        rowObj.removeClass("highlight_background");
    }
    
    if (!checkIsEmpty(uniqueId)) {
        // update (add/remove) check object in list?
    }

    if (finishCheck) {
        var checkedRows = this.GetCheckedRows();
        this.SetSelCounter(checkIsEmpty(checkedRows) ? 0 : checkedRows.length);
    }
}

// [deprecated] show message on top row
JoyTable.prototype.ShowMessage = function ShowMessage(showHide, message) {
	var messageRowObj = this.TableObject.find("#message_field");
	if (messageRowObj.length > 0) {
		messageRowObj.text(message);
		if (showHide)
			//messageRowObj.attr("style", "");
			messageRowObj.removeClass("hide");
		else
			//messageRowObj.attr("style", "display:none");
			messageRowObj.addClass("hide");
	}
}

// clone a template row (internal use)
JoyTable.prototype.TableAddRowElement = function TableAddRowElement() {
	//var this.TableObject = $(obj);
	var headerObjs = this.TableObject.find(".list_header th");
	var headerObjRoot = this.TableObject.find(".list_header");
	
	var templateObj = this.TableObject.find("#data_template_" + this.RootObject.attr('id')); // find the template obj
	var className = templateObj.attr("class");
	var trParent = templateObj.parent(); // find tr container
	
	//var hasTitleRow = (trParent.find(".list_header th").length > 0);
	// begin to clone
	var cloneObj = templateObj.clone();
	//cloneObj.html(cloneObj.html().replace(/_N/g, "_" + (idx + i))); // replace keyword
	//cloneObj.html(cloneObj.html().replace(/select2/g, "select")); // replace keyword
	templateObj.parent().append(cloneObj); // insert obj
	
	// attach data attribute from th to cloned td
	var cloneTdObjs = cloneObj.find("td");
	for (var i=0; i<cloneTdObjs.length; i++) {
		var tdObj = $(cloneTdObjs[i]);
		var tdName = tdObj.attr("name");
		if (!checkIsEmpty(tdName)) {
			var headerObj = headerObjRoot.find("th[name=" + tdName + "]");
			if (!checkIsEmpty(headerObj)) {
                // remove data attr
				//var dataField = headerObj.attr("data");
				//tdObj.attr("data", dataField);
			}
		}
        // binding click event on specifial td element
		if (tdName == "check_row") {
		    var checkObj = tdObj.find("input[type='checkbox']");
		    var bindingColEventObj = {
		        handleEvent: function (e) {
		            this.tableClassObj.CheckRow(this.rowObj);
		        },
		        tableClassObj: this,
		        rowObj: cloneObj
		    };
		    $(checkObj)[0].addEventListener("click", bindingColEventObj, false);
		}
	}
	cloneObj.removeClass("template");
	cloneObj.removeClass("hide");

    // binding click event on row
	var bindingRowEventObj = {
	    handleEvent: function (e) {
	        this.tableClassObj.ClickRow(this.rowObj);
	    },
	    tableClassObj: this,
        rowObj: cloneObj
	};
	$(cloneObj)[0].addEventListener("click", bindingRowEventObj, false);
    // todo: checkbox add listener
	return cloneObj;
}

// clear table content
JoyTable.prototype.Clear = function Clear() {
    var reservedClassNames = ["list_header", "template"];
	var rowObjs = this.TableObject.find("tbody tr");
	for (var i=0; i<rowObjs.length; i++) {
		var rowObj = $(rowObjs[i]);
		var classNames = rowObj.attr("class").split(" ");
		var bIsReserved = false;
		for (var j=0; j<classNames.length; j++) {
			var className = classNames[j];
			if (reservedClassNames.indexOf(className) >= 0) {
				bIsReserved = true;
				break;
			}
		}
		if (bIsReserved)
			continue; // skip this row
		rowObj.remove();
	}
	var headerSortIcons = this.TableHeaderObject.find("img");
	for (var i=0; i<headerSortIcons.length; i++) {
		var headerSortIconObj = $(headerSortIcons[i]);
		if (headerSortIconObj.attr("src").indexOf("sort") >= 0) {
			headerSortIconObj.addClass("hide");
			headerSortIconObj.attr("src", "/images/sort_az.png");
		}
	}
    this.FinishAdd(0, false);
	if (this.Events.OnClear != null && typeof (window[this.Events.OnClear]) === "function")
	    window[this.Events.OnClear](this.TableObject);
	
	if (this.Events.OnChanged != null && typeof (window[this.Events.OnChanged]) === "function")
	    window[this.Events.OnChanged](this.TableObject);
}

// count row and update record/selected row counter (internal use)
JoyTable.prototype.CountRow = function CountRow(bShowSn) {
    if (bShowSn == undefined)
        bShowSn = false;

    //var headerObjs = $(this.TableObject.find("th[name=serial_number]"));
    var headerObjs = this.TableTheadObject.find("th[name=serial_number]");
    for (var i = 0; i < headerObjs.length; i++) {
        if (bShowSn) {
            $(headerObjs[i]).css("display", "");
        }
    }
    //$(headerObjs[i]).removeClass("hide");
    var rowObjs = this.TableObject.find("tbody tr:not(.template)"); // get each data row
    var counter = 0;
    if (checkIsEmpty(rowObjs))
		return 0;
    for (var i = 0; i < rowObjs.length; i++) {
        var rowObj = $(rowObjs[i]);
        if (rowObj.attr("class").indexOf("hide") >= 0) // don't check height(). becoz sometimes the ui not shown
            continue;
        counter++;
        if (bShowSn != true) // return if no need show sn
            continue;

        var snColObjs = rowObj.find("[name=serial_number]");
        if (checkIsEmpty(snColObjs)) // return if sn column not found
            continue;

        var snColObj = $(snColObjs[0]);
        snColObj.attr("style", "");
        snColObj.find(':not(:has(*))').text(counter); // set the number to text
        //snColObj.text(counter); // set the number to text
    }
    return counter;
}

// show/hide serial number column of table
JoyTable.prototype.ShowSn = function ShowSn(bShowSn) {
    this.SnColVisible = bShowSn;
    if (checkIsEmpty(bShowSn))
        bShowSn = true;

    return this.CountRow(bShowSn);
}

// show/hide check box column of table
JoyTable.prototype.ShowCheckbox = function ShowCheckbox(bShowCk) {
    this.RowSelectable = bShowCk;
    var checkObjs = this.TableObject.find("[name=check_row]");
    for (var i = 0; i < checkObjs.length; i++) {
        var checkObj = $(checkObjs[i])
        if (bShowCk) {
            //checkObj.attr("style", checkObj.attr("style").replace("display:none;", ""));
            checkObj.css("display", "");
        }
        else {
            //if (checkObj.attr("style").indexOf("display:none") < 0)
            //    checkObj.attr("style", "display:none;" + checkObj.attr("style"));
            checkObj.css("display", "none");
        }
    }
}

// [deprecated] scroll table to indicated row by id
JoyTable.prototype.ScrollTo = function ScrollTo(id, topOffset) {
	var target = $("#" + id);
	var container = null;
	
	container = this.TableObject.parents("div");
	if (checkIsEmpty(container)) {
		container = table.parents("body");
		if (checkIsEmpty(container))
			return;
	}
	
	var tableHeadHeight = this.TableObject.find("thead").height();
	
	for (var i=0; i<container.length; i++) {
		var trgContainer = $(container[i]);
		if (!trgContainer.hasScrollBar())
			continue;
		//if (!checkIsEmpty(trgContainer.attr("style")) && trgContainer.attr("style").indexOf("scrollable") < 0)
		//	continue;
		trgContainer.animate({
			scrollTop: target.offset().top - topOffset - tableHeadHeight
		}, 1000)
	}
}

