import * as path from "path";
import * as fs from "fs";
import puppeteer from "puppeteer";
import ExporterInterface, {
  ExporterInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/exporters/exporter.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";

export class HtmlToPngExporter implements ExporterInterface {
  private rendersGetter!: ItemsDataManager["getRenders"];
  private outputPath!: string;
  private imagesPath!: string;
  private width: number;
  private height: number;

  constructor(
    constructorProps: {
      width?: number;
      height?: number;
    } = {}
  ) {
    this.width = constructorProps.width ?? 800;
    this.height = constructorProps.height ?? 600;
  }

  public async init(props: ExporterInitPropsInterface) {
    this.rendersGetter = props.rendersGetter;
    this.outputPath = props.outputPath;
    this.imagesPath = path.join(this.outputPath, "png");
  }

  public async export(): Promise<void> {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath);
    }

    if (!fs.existsSync(this.imagesPath)) {
      fs.mkdirSync(this.imagesPath);
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: this.width, height: this.height });

    for (const [itemUid, renders] of Object.entries(this.rendersGetter())) {
      //@ts-ignore
      let html = renders.find(
        //@ts-ignore
        (render) => "HtmlLayeredImagesRendererInterface@v1" === render.kind
      );

      if (!html) {
        throw new Error(`Could not find any supported html`);
      }

      //@ts-ignore
      let attributes = renders.find(
        //@ts-ignore
        (render) => "ItemAttributesRendererInterface@v1" === render.kind
      );

      if (!attributes) {
        throw new Error(`Could not find any supported attributes`);
      }

      const htmlPath = html?.data.path;
      const outputImagePath = path.join(
        this.imagesPath,
        `${attributes?.data.dna[0]}.png`
      );

      if (htmlPath) {
        await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
        await page.screenshot({ path: outputImagePath });
      }
    }

    await browser.close();
  }
}
