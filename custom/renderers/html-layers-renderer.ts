import * as path from "path";
import * as fs from "fs";
import RendererInterface, {
  ItemsRenders,
  RendererInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/renderers/renderer.interface";
import ItemsDataManager from "@hashlips-lab/art-engine/dist/utils/managers/items-data/items-data.manager";
import { HtmlLayersGeneratorInterface } from "../generators/html-layers-attributes-generator";

const TEMP_CACHE_DIR = "temp";

export default interface HtmlLayeredImagesRendererInterface {
  path: string;
  latestModifiedTimestamp: number;
}

export interface Asset {
  path: string;
  latestModifiedTimestamp: number;
  xOffset: number;
  yOffset: number;
  zOffset: number;
}

export class HtmlLayersRenderer
  implements RendererInterface<HtmlLayeredImagesRendererInterface>
{
  private attributesGetter!: ItemsDataManager["getAttributes"];
  private tempRenderDir!: string;

  constructor() {}

  public async init(props: RendererInitPropsInterface) {
    this.attributesGetter = props.attributesGetter;
    this.tempRenderDir = path.join(props.cachePath, TEMP_CACHE_DIR);
  }

  public async render(): Promise<
    ItemsRenders<HtmlLayeredImagesRendererInterface>
  > {
    const renders: ItemsRenders<HtmlLayeredImagesRendererInterface> = {};

    for (const [itemUid, attributes] of Object.entries(
      this.attributesGetter()
    )) {
      if (!fs.existsSync(this.tempRenderDir)) {
        fs.mkdirSync(this.tempRenderDir);
      }

      const supportedAssets: HtmlLayersGeneratorInterface["assets"] =
        //@ts-ignore
        attributes
          .filter(
            //@ts-ignore
            (attribute) => attribute.kind === "HtmlLayersGeneratorInterface@v1"
          )
          //@ts-ignore
          .flatMap((attribute) => attribute.data.assets);

      if (supportedAssets.length < 1) {
        throw new Error(
          `Couldn't find any supported set of attributes for the current item: ${itemUid}`
        );
      }

      let assets = supportedAssets.sort((a, b) => a.zOffset - b.zOffset);

      const outputPath = path.join(this.tempRenderDir, `${itemUid}.html`); // Corrected line

      const baseHtml = `
      <!DOCTYPE html>
      <head>
        <style>
          body, html, div {
            margin: 0;
            padding: 0;
            height: 100%;
            box-sizing: border-box;
          }
          div {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <html>
        <body style="display: flex; flex-direction: column">
          ${assets
            .map((asset) => fs.readFileSync(asset.path, "utf8"))
            .join("\n")}
        </body>
      </html>
      `;

      fs.writeFileSync(outputPath, baseHtml);

      const outputStats = fs.statSync(outputPath);

      renders[itemUid] = [
        {
          kind: "HtmlLayeredImagesRendererInterface@v1",
          data: {
            path: outputPath,
            latestModifiedTimestamp: outputStats.mtime.getTime(),
          },
        },
      ];
    }

    return renders;
  }
}
