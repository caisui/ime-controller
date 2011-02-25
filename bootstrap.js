const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

const windowtype = "navigator:browser"

const console = {
    log: function _log() {
        Services.console.logStringMessage(
            Array.slice(arguments).map(function (a) (a || "(null)").toString().quote()).join(" "));
    },
    dump: function _dump(obj) {
        Object.getOwnPropertyNames(obj).forEach(function (n) {
            console.log(n, obj[n] || "");
        });
    },
    logReason: function (args) {
        let [data, reason] = args;
        console.log(args.callee.name, [s for (s in data) if (data[s] === reason)][0]);
    },
};

const dispose = [];
dispose.__defineSetter__("$push", function (v) this.push(v));

function registerObject(aWindow) {
    const name = "gIMEManager";

    aWindow[name] = observer.obj;
    return function () delete aWindow[name];
}

const observer = {
    init: function () {
        try {
        Cu.import("resource://gre/modules/ctypes.jsm");

        let api = {};

        const DWORD   = ctypes.uint32_t;
        const LPDWORD = ctypes.uint32_t.ptr;
        const WINAPI  = ctypes.winapi_abi;

        this.dispose = [["user32.dll", [
            ["GetFocus", WINAPI, DWORD],
        ]],
        ["imm32.dll", [
            ["ImmGetContext",          WINAPI, DWORD, DWORD],
            ["ImmReleaseContext",      WINAPI, DWORD, DWORD,  DWORD],
            ["ImmGetOpenStatus",       WINAPI, DWORD, DWORD],
            ["ImmSetOpenStatus",       WINAPI, DWORD, DWORD,  DWORD],
            ["ImmGetConversionStatus", WINAPI, DWORD, DWORD,  LPDWORD, LPDWORD],
            ["ImmSetConversionStatus", WINAPI, DWORD, DWORD,  DWORD,   DWORD],
        ]]
        ].map(function ([name, funcs]) {
            let lib = ctypes.open(name);
            funcs.forEach(function (args) {
                api[args[0]] = lib.declare.apply(lib, args);
            });
            return function () lib.close();
        });

        this.dispose.push(function () api = null);

        function func_himc(func) {
            let hwnd = api.GetFocus();
            let himc = api.ImmGetContext(hwnd);
            let ret = func(himc);
            api.ImmReleaseContext(hwnd, himc);
            return ret;
        }
        function GetConversionStatus() {
            return func_himc(function _GetConversionStatus(himc) {
                var [aConversion, aSentence] = [DWORD(), DWORD()];
                api.ImmGetConversionStatus(himc, aConversion.address(), aSentence.address());
                return [aConversion.value, aSentence.value];
            });
        }
        function SetConversionStatus(aConversion, aSentence) {
            return func_himc(function _GetConversionStatus(himc) {
                return api.ImmSetConversionStatus(himc, aConversion, aSentence);
            });
        }

        this.obj = {
            get enabled()
                func_himc(function (himc) api.ImmGetOpenStatus(himc) === 1)
            ,
            set enabled(value) {
                func_himc(function (himc) {
                    api.ImmSetOpenStatus(himc, value ? 1 : 0);
                });
            },
            get conversion () GetConversionStatus()[0],
            get sentence   () GetConversionStatus()[1],
            set conversion (value) SetConversionStatus(value,   this.sentence),
            set sentence   (value) SetConversionStatus(this.conversion, value),
        };
        } catch(ex){Cu.reportError(ex);}
    },
    uninit: function () {
        this.dispose.forEach(function (f) f());
    },
    observe: function observe(aSubject, aTopic, aData) {
        switch (aTopic) {
            case "domwindowopened":
                aSubject.addEventListener("load", function _onload() {
                    aSubject.removeEventListener("load", _onload, false);
                    if (aSubject.document.documentElement.getAttribute("windowtype") === windowtype) {
                        console.log(aSubject, aTopic, aData, aSubject.document.documentElement.getAttribute("windowtype"));
                        dispose.$push = registerObject(aSubject);
                    }
                }, false);
            break;
        }
    },
};

function startup(data, reason) {
    console.logReason(arguments);

    observer.init();
    dispose.$push = function () observer.uninit();

    let iter = Services.wm.getEnumerator(windowtype);
    while (iter.hasMoreElements()) {
        dispose.$push = registerObject(iter.getNext());
    }
    Services.ww.registerNotification(observer.observe);
    dispose.$push = function () Services.ww.unregisterNotification(observer.observe);
}

function shutdown(data, reason) {
    console.logReason(arguments);
    dispose.forEach(function (f) f());
}
function install(data, reason) {
    console.logReason(arguments);
}
function uninstall(data, reason) {
    console.logReason(arguments);
}
