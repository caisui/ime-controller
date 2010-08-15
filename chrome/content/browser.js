// vim: set et sw=4 ts=4 :
(function(){
    if (!navigator.plugins["Shockwave Flash"]) return;
    //https://developer.mozilla.org/ja/DOM/window.navigator.platform
    const isLinux = /^Linux/.test(navigator.platform);

    const Cc = Components.classes;
    const Ci = Components.interfaces;
    const ext_name = "imecontroller@localhost";
    const flash_file = <>extensions/{ext_name}/chrome/content/imecontroller.swf</>.toString();
    const propName = isLinux ? "Home" : "AppData";

    //http://www.adobe.com/jp/devnet/flashplayer/articles/flash_player_admin_guide/flash_player_admin_guide.pdf
    //P.83
    //
    //- Windows Vista C:\Users\ユーザ名\AppData\Roaming\Macromedia\Flash Player\#Security\FlashPlayerTrust
    //- Windows 2000 および Windows XP C:\Documents and Settings\ユーザ名\Application Data\Macromedia\Flash Player\#Security\FlashPlayerTrust
    //- Macintosh /Users/ユーザ名/Library/Preferences/Macromedia/Flash Player/#Security\FlashPlayerTrust
    //- inux GNU-Linux ~/.macromedia/#Security/FlashPlayerTrust
    //

    const trust_path = (isLinux ? [".macromedia"] : ["Macromedia", "Flash Player"])
        .concat(["#Security","FlashPlayerTrust"]);

    function init() {
        const prop = Cc["@mozilla.org/file/directory_service;1"]
            .getService(Ci.nsIProperties);
        window.removeEventListener("load", init, false);

        let file = prop.get("ProfD",Ci.nsIFile);
        for (let[,p] in Iterator(flash_file.split("/"))) {
            file.append(p);
        }
        if (!file.exists() || !file.isFile()) return;
        let trust_file = file.path;

        file = prop.get(propName, Ci.nsIFile);

        for (let [,p] in Iterator(trust_path)) {
            file.append(p);
        }
        if (!file.exists() || !file.isDirectory()) return;
        file.append(trust_file.replace(/[:\/\\]+/g,"_").concat(".cfg"));
        if (!file.exists()) {
            //https://developer.mozilla.org/ja/Code_snippets/File_I%2F%2FO#section_20
            let ost =    Cc['@mozilla.org/network/file-output-stream;1']
                .createInstance(Ci.nsIFileOutputStream);
            ost.init(file, -1, 0644, 0);
            ost.write(trust_file, trust_file.length);
            ost.close();
            Application.restart();
        }
        let ime = document.getElementById("ime-controller-swf");
        let frame = document.getElementById("ime-controller-frame");
        if(!frame) return;
        let ime = frame.contentDocument.getElementById("ime-controller-swf");
        if(!ime.getIMEStatus) return;

        //crate object
        gIMEController = { mode: {} };
        for(let [nm,text] in Iterator(ime.modes())) {
            let name = nm;
            gIMEController[name] = function () { ime[name](); };
            gIMEController.mode[text] = text;
        }

        gIMEController.__defineGetter__("enabled", function() ime.getIMEStatus());
        gIMEController.__defineSetter__("enabled", function(value) { value=!!value; ime.setIMEStatus(value); return value;});
        gIMEController.__defineGetter__("conversion", function () { return ime.getIMEConversion();});
        gIMEController.__defineSetter__("conversion", function (value) {
            if (value in this.mode) {
                ime.setIMEConversion(value);
            } else {
                value = this.conversion;
            }

            return value;
        });
        gIMEController.removeTrustFile = function() {
            file.remove(false);
        };

        Application.extensions.get(ext_name).events.addListener("uninstall", function () { file.remove(false); });
    }
    window.addEventListener("load", init, false);
})();
