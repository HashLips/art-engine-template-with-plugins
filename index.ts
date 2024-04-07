import { HtmlExporter } from "./custom/exporters/html-exporter";
import { HtmlToPngExporter } from "./custom/exporters/html-to-png-exporter";
import { HtmlLayersAttributesGenerator } from "./custom/generators/html-layers-attributes-generator";
import { HtmlLayersInput } from "./custom/inputs/html-layers-input";
import { HtmlLayersRenderer } from "./custom/renderers/html-layers-renderer";

const { ArtEngine, renderers, exporters } = require("@hashlips-lab/art-engine");

const BASE_PATH = __dirname;

const ae = new ArtEngine({
  cachePath: `${BASE_PATH}/../cache`,
  outputPath: `${BASE_PATH}/../output`,
  useCache: false,

  inputs: {
    html: new HtmlLayersInput({
      assetsBasePath: `${BASE_PATH}/../elements`,
    }),
  },

  generators: [
    new HtmlLayersAttributesGenerator({
      dataSet: "html",
      startIndex: 1,
      endIndex: 20,
    }),
  ],

  renderers: [
    new renderers.ItemAttributesRenderer({
      name: (itemUid: string) => `html ${itemUid}`,
      description: (attributes: any) => {
        return `This is a pure html and css artwork`;
      },
    }),
    new HtmlLayersRenderer(),
  ],

  exporters: [
    new HtmlExporter(),
    // new HtmlToPngExporter({ width: 1920, height: 1080 }),
    new exporters.Erc721MetadataExporter({
      imageUriPrefix: "ipfs://__CID__/",
    }),
  ],
});

(async () => {
  await ae.run();
  await ae.printPerformance();
})();
