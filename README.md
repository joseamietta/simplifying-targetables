# PWAStudio simplifying targetables

## Usage Exsample

```javascript
const { ExtendLocalIntercept } = require('@joseamietta/simplifying-targetables');

function localIntercept(targets) {
  const extendLocalIntercept = new ExtendLocalIntercept(targets);
  extendLocalIntercept.allowTargetables();
  extendLocalIntercept.allowCssOverwrites();
  extendLocalIntercept.allowPeregrineWraps();
}

module.exports = localIntercept;
```