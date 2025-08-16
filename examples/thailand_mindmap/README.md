Run any of these:

```bash
# Programmatic build
node thailand_mindmap.js

# From CSV
ROSEMARY_DATA_FILE=./examples/thailand_mindmap/thailand_mindmap.json node -e "const R=require('../../src/Rosemary');const p=require('path');const b=new R({dataFile:process.env.ROSEMARY_DATA_FILE});b.importFromCSV(p.join(process.cwd(),'examples/thailand_mindmap/thailand_mindmap.csv')).then(()=>console.log('done'))"
```
