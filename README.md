# BetterMarked series - Misc QoL fix extension for LLMs' output

## Better Chinese punctuation

忽略CommonMark规范，让marked能正确加粗下面示例中的字符串，它们经常出现在中文LLM的回复中
- 这就是**“我得到吨”**与商业**“比比拉布”**的典型差异。
- 这就是*开源“我得到吨”*与**商业“比比拉布”**的典型差异。
- `这就是**“我得到吨”**与商业**“比比拉布”**的典型差异。`
- `这就是*开源“我得到吨”*与**商业“比比拉布”**的典型差异。`

```js
import {markedBetterChinesePunc} from 'better-marked';
marked.use(markedBetterChinesePunc())
```

## Better KaTeX

首先，这个项目默认的katex版本是`0.7.0`，非常老，但是足够你与LLM日常交流中使用公式了  
通过使用旧版本，比起最新版本，我们可以节省~130KB的打包大小  

```js
import {markedBetterKaTeX} from 'better-marked';
marked.use(markedBetterKaTeX())
```

另外，在`0.7.0`版本中，如果可能，请编辑`katex/src/buildTree.js`，改成这样，这可以进一步减小打包大小（10KB左右吧）
```js
// 1. 注释掉这里
//var buildMathML = require("./buildMathML");

var buildTree = function(tree, expression, settings) {
	// 2. 注释掉这里
    var katexNode = makeSpan(["katex"], [
        /*mathMLNode, */htmlNode
    ]);
};
```

> 另外，我这个人的个性如此，我就是喜欢改依赖，当然，我克制了，我把它做成 optional 的