import $ from "../../core/renderer";
import eventsEngine from "../../events/core/events_engine";
import eventUtils from "../../events/utils";
import { extend } from "../../core/utils/extend";

const FOCUS_STATE_CLASS = "dx-state-focused",
    FOCUS_DISABLED_CLASS = "dx-cell-focus-disabled",
    GRID_CELL_SELECTOR = ".dx-datagrid-rowsview .dx-datagrid-content .dx-row > td",
    TREELIST_CELL_SELECTOR = ".dx-treelist-rowsview .dx-treelist-content .dx-row > td",
    viewItemSelectorMap = {
        groupPanel: [".dx-datagrid-group-panel .dx-group-panel-item[tabindex]"],
        columnHeaders: [".dx-datagrid-headers .dx-header-row > td.dx-datagrid-action", ".dx-treelist-headers .dx-header-row > td.dx-treelist-action"],
        filterRow: [".dx-datagrid-headers .dx-datagrid-filter-row .dx-editor-cell input", ".dx-treelist-headers .dx-treelist-filter-row .dx-editor-cell input"],
        rowsView: [`${GRID_CELL_SELECTOR}[tabindex]`, `${GRID_CELL_SELECTOR}`, `${TREELIST_CELL_SELECTOR}[tabindex]`, `${TREELIST_CELL_SELECTOR}`],
        footer: [".dx-datagrid-total-footer .dx-datagrid-summary-item", ".dx-treelist-total-footer .dx-treelist-summary-item"],
        filterPanel: [".dx-datagrid-filter-panel .dx-icon-filter", ".dx-treelist-filter-panel .dx-icon-filter"],
        pager: [".dx-datagrid-pager [tabindex]", ".dx-treelist-pager [tabindex]"]
    };

var isMouseDown = false,
    isHiddenFocusing = false,
    focusedElementInfo = null;

function processKeyDown(viewName, instance, event, action, $mainElement) {
    var keyName = eventUtils.normalizeKeyName(event);

    if(keyName === "enter" || keyName === "space") {
        saveFocusedElementInfo(event.target, instance);
        action && action({ event: event });
    } else if(keyName === "tab") {
        $mainElement.addClass(FOCUS_STATE_CLASS);
    } else {
        module.exports.selectView(viewName, instance, event);
    }
}

function saveFocusedElementInfo(target, instance) {
    var $target = $(target),
        ariaLabel = $target.attr("aria-label"),
        $activeElements = getActiveAccessibleElements(ariaLabel, instance.element()),
        targetIndex = $activeElements.index($target);

    focusedElementInfo = extend({},
        { ariaLabel: ariaLabel, index: targetIndex },
        { viewInstance: instance });
}

function getActiveAccessibleElements(ariaLabel, viewElement) {
    var $viewElement = $(viewElement),
        $activeElements;

    if(ariaLabel) {
        $activeElements = $viewElement.find(`[aria-label="${ariaLabel}"][tabindex]`);
    } else {
        $activeElements = $viewElement.find("[tabindex]");
    }

    return $activeElements;
}

function findFocusedViewElement(viewSelectors) {
    for(let index in viewSelectors) {
        let selector = viewSelectors[index],
            $focusViewElement;

        $focusViewElement = $(selector).first();

        if($focusViewElement.length) {
            return $focusViewElement;
        }
    }
}

module.exports = {
    hiddenFocus: function(element) {
        isHiddenFocusing = true;
        element.focus();
        isHiddenFocusing = false;
    },

    registerKeyboardAction: function(viewName, instance, $element, selector, action) {
        if(instance.option("useLegacyKeyboardNavigation")) {
            return;
        }

        var $mainElement = $(instance.element());

        eventsEngine.on($element, "keydown", selector, e => processKeyDown(viewName, instance, e, action, $mainElement));
        eventsEngine.on($element, "mousedown", selector, () => {
            isMouseDown = true;
            $mainElement.removeClass(FOCUS_STATE_CLASS);
        });
        eventsEngine.on($element, "focusin", selector, () => {
            if(!isMouseDown && !isHiddenFocusing) {
                $mainElement.addClass(FOCUS_STATE_CLASS);
            }

            isMouseDown = false;
        });
    },

    restoreFocus: function(instance) {
        if(!instance.option("useLegacyKeyboardNavigation") && focusedElementInfo) {
            let viewInstance = focusedElementInfo.viewInstance;
            if(viewInstance) {
                let $activeElements = getActiveAccessibleElements(focusedElementInfo.ariaLabel, viewInstance.element()),
                    $targetElement = $activeElements.eq(focusedElementInfo.index);

                focusedElementInfo = null;

                eventsEngine.trigger($targetElement, "focus");
            }
        }
    },

    selectView: function(viewName, instance, event) {
        var keyName = eventUtils.normalizeKeyName(event);

        if(event.ctrlKey && (keyName === "upArrow" || keyName === "downArrow")) {
            let viewNames = Object.keys(viewItemSelectorMap),
                viewItemIndex = viewNames.indexOf(viewName);

            while(viewItemIndex >= 0 && viewItemIndex < viewNames.length) {
                viewItemIndex = keyName === "upArrow" ? --viewItemIndex : ++viewItemIndex;
                let viewName = viewNames[viewItemIndex],
                    viewSelectors = viewItemSelectorMap[viewName],
                    $focusViewElement = findFocusedViewElement(viewSelectors);
                if($focusViewElement && $focusViewElement.length) {
                    $focusViewElement.attr("tabindex", instance.option("tabindex") || 0);
                    eventsEngine.trigger($focusViewElement, "focus");
                    $focusViewElement.removeClass(FOCUS_DISABLED_CLASS);
                    break;
                }
            }
        }
    },

    setTabIndex: function(instance, $element) {
        if(!instance.option("useLegacyKeyboardnavigation")) {
            $element.attr("tabindex", instance.option("tabindex") || 0);
        }
    }
};
