// vim: set syntax=javascript sw=2 et ts=2 :
package {
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.TextEvent;
    import flash.system.IME;
    import flash.system.IMEConversionMode;
    import flash.external.ExternalInterface;
    import flash.system.Security;
    import flash.text.TextField;

    /**
     * ...
     * @author
     */

    public class IMEController extends Sprite {
        public function IMEController () : void {
            Security.allowDomain("*");
            if (stage) init();
            else addEventListener(Event.ADDED_TO_STAGE, init);

            (function():void {
                const ime : Object = {
                    setAscii: IMEConversionMode.ALPHANUMERIC_HALF,
                    setAsciiFull:IMEConversionMode.ALPHANUMERIC_FULL,
                    setZenHira: IMEConversionMode.JAPANESE_HIRAGANA,
                    setHanKana: IMEConversionMode.JAPANESE_KATAKANA_HALF,
                    setZenKana: IMEConversionMode.JAPANESE_KATAKANA_FULL,
                    setKorean: IMEConversionMode.KOREAN,
                    setChinese: IMEConversionMode.CHINESE
                };
                var attr:String;
                for (attr in ime) {
                    (function(func:String,val:String):void{
                    ExternalInterface.addCallback(func, function():void {
                        if (!IME.enabled) IME.enabled = true;
                        IME.conversionMode = val;
                    } ); } )(attr,ime[attr]);
                }

                ExternalInterface.addCallback("modes", function():Object { return ime; } );
                ExternalInterface.addCallback("getIMEStatus", function():Boolean {return IME.enabled;});
                ExternalInterface.addCallback("setIMEStatus", function(value:Boolean):void {IME.enabled = value;});
                ExternalInterface.addCallback("getIMEConversion", function():String {return IME.conversionMode;});
                ExternalInterface.addCallback("setIMEConversion", function(conversion:String):void { IME.conversionMode = conversion; } );
            })();
        }

        private function init(e:Event = null) : void {
            removeEventListener(Event.ADDED_TO_STAGE, init);
            // entry point
        }
    }
}
