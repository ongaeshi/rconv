import { BrowserVm } from "./browserVm";
import CodeMirror from "codemirror";
import "codemirror/mode/ruby/ruby";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/rubyblue.css";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "./style.css";
import LZString from "lz-string"

let browserVm:BrowserVm;

let outputBuffer:string[] = [];

const codeEditor = CodeMirror.fromTextArea(
  document.getElementById("input") as HTMLTextAreaElement,
  {
    theme: 'rubyblue',
    mode: "text/x-ruby",
    indentUnit: 2,
    matchBrackets: true,
    autoCloseBrackets: true
  }
);

codeEditor.setOption("extraKeys", {
  "Ctrl-Enter": function(cm) {
    runRubyScriptsInHtml()
  }
});

const outputTextArea:HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("output");

const printToOutput = function (line: string):void {
  outputBuffer.push(line);
  outputTextArea.value = outputBuffer.join("");
}

const main = async () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const code = urlParams.get('q')
  if (code !== null) {
    if (code === "") {
      codeEditor.setValue("")
    } else {
      codeEditor.setValue(LZString.decompressFromEncodedURIComponent(code))
    }
  }

  browserVm = new BrowserVm()
  await browserVm.createVm(printToOutput)

  browserVm.vm.eval(
    `
class Rconv
  def self.set(opt = {}, &block)
    @conv ||= Caller.new
    @conv.set(opt, &block)
  end

  def self.call(arg)
    @conv.call(arg)
  end

  def self.title = @conv.title

  class Caller
    def set(opt = {}, &block)
      @opt = opt
      @conv = block
    end
    
    def call(arg)
      @conv.call(arg)
    end

    def title = @opt[:title] || "Rconv"
  end
end
    `
  )

  document.getElementById("run").onclick = runRubyScriptsInHtml;
  document.getElementById("clear").onclick = selectAllScripts;
  document.getElementById("input2").onkeydown = checkRunWithKeyboard;

  codeEditor.focus();

  runRubyScriptsInHtml();
};

export const runRubyScriptsInHtml = function () {
  outputBuffer = [];

  try {
    // Rewrite URL
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    urlParams.set("q", LZString.compressToEncodedURIComponent(codeEditor.getValue()))
    history.replaceState('', '', "?" + urlParams.toString());

    // Run eval
    const input2 = <HTMLTextAreaElement>document.getElementById("input2");

    const result = browserVm.vm.eval(codeEditor.getValue() + `; Rconv.call('${input2.value}')`)
    document.title = browserVm.vm.eval("Rconv.title").toString()

    if (outputBuffer.length == 0) {
      outputTextArea.value += result.toString() + "\n"
      outputTextArea.scrollTop = outputTextArea.scrollHeight
    }
  } catch (error) {
    outputTextArea.value += error + "\n";
    outputTextArea.scrollTop = outputTextArea.scrollHeight
  }
};

export const selectAllScripts = function () {
  codeEditor.focus();
  codeEditor.execCommand("selectAll");
};

export const checkRunWithKeyboard = function(event: KeyboardEvent) {
  if (event.ctrlKey && event.key == "Enter") {
    runRubyScriptsInHtml();
  } 
}

main();
