import * as path from "path";
import * as fs from "fs";
import ExporterInterface, {
  ExporterInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/exporters/exporter.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";

export class HtmlExporter implements ExporterInterface {
  private rendersGetter!: ItemsDataManager["getRenders"];
  private outputPath!: string;
  private htmlPath!: string;

  constructor() {}

  public async init(props: ExporterInitPropsInterface) {
    this.rendersGetter = props.rendersGetter;
    this.outputPath = props.outputPath;
    this.htmlPath = path.join(this.outputPath, "html");
  }

  public async export(): Promise<void> {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath);
    }

    if (!fs.existsSync(this.htmlPath)) {
      fs.mkdirSync(this.htmlPath);
    }

    for (const [itemUid, renders] of Object.entries(this.rendersGetter())) {
      // @ts-ignore
      let html = renders.find(
        // @ts-ignore
        (render) => "HtmlLayeredImagesRendererInterface@v1" === render.kind
      );

      if (!html) {
        throw new Error(`Could not find any supported html`);
      }

      // @ts-ignore
      let attributes = renders.find(
        // @ts-ignore
        (render) => "ItemAttributesRendererInterface@v1" === render.kind
      );

      if (!attributes) {
        throw new Error(`Could not find any supported attributes`);
      }

      fs.copyFileSync(
        html?.data.path,
        path.join(this.htmlPath, `${attributes?.data.dna[0]}.html`)
      );
    }
  }
}
