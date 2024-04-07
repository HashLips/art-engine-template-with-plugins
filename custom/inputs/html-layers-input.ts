import InputInterface, {
  InputInitPropsInterface,
} from "@hashlips-lab/art-engine/dist/common/inputs/input.interface";

import * as fs from "fs";
import * as path from "path";

export interface LayerAsset {
  path: string;
  size: number;
  relativeXOffset: number;
  relativeYOffset: number;
  relativeZOffset: number;
  lastModifiedTime: number;
}

export interface HtmlLayersInputInterface {
  basePath: string;
  layers: {
    [traitName: string]: {
      name: string;
      baseXOffset: number;
      baseYOffset: number;
      baseZOffset: number;
      options: {
        [optionName: string]: {
          name: string;
          weight: number;
          assets: LayerAsset[];
          edgeCases: {
            [matchUid: string]: {
              matchingTrait: string;
              matchingValue: string;
              assets: LayerAsset[];
            };
          };
        };
      };
    };
  };
}

export interface FileNameParams {
  name: string;
  x: number;
  y: number;
  z: number;
  w?: number;
  t?: string;
  v?: string;
}

export type Layers = HtmlLayersInputInterface["layers"];
export type Options = HtmlLayersInputInterface["layers"][string]["options"];

export const EDGE_CASE_UID_SEPARATOR = "#";

export class HtmlLayersInput
  implements InputInterface<HtmlLayersInputInterface>
{
  private assetsBasePath!: string;

  constructor(constructorProps: { assetsBasePath: string }) {
    this.assetsBasePath = constructorProps.assetsBasePath;
  }

  public async init(props: InputInitPropsInterface) {}

  public async load(): Promise<HtmlLayersInputInterface> {
    let layers = this.getLayersFromFolders(this.assetsBasePath);

    return { basePath: this.assetsBasePath, layers: layers };
  }

  private getParams(fileName: string): FileNameParams {
    const [name, ...rawParamsArray] = fileName.split(".")[0].split("__");
    const rawParamsMap = new Map<string, string>();

    for (const param of rawParamsArray) {
      const type = param.charAt(0);
      const value = param.slice(1);

      rawParamsMap.set(type, value);
    }

    const rawWeight = rawParamsMap.get("w");
    const normalizedParams: FileNameParams = {
      name: name,
      x: parseInt(rawParamsMap.get("x") ?? "0"),
      y: parseInt(rawParamsMap.get("y") ?? "0"),
      z: parseInt(rawParamsMap.get("z") ?? "0"),
      w: rawWeight === undefined ? undefined : parseInt(rawWeight),
      t: rawParamsMap.get("t"),
      v: rawParamsMap.get("v"),
    };

    if (!Number.isFinite(normalizedParams.x)) {
      throw new Error(
        `Invalid X offset value "${normalizedParams.x}" found in "${fileName}".`
      );
    }

    if (!Number.isFinite(normalizedParams.y)) {
      throw new Error(
        `Invalid Y offset value "${normalizedParams.y}" found in "${fileName}".`
      );
    }

    if (!Number.isFinite(normalizedParams.z)) {
      throw new Error(
        `Invalid Z offset value "${normalizedParams.z}" found in "${fileName}".`
      );
    }

    if (
      normalizedParams.w !== undefined &&
      (!Number.isFinite(normalizedParams.w) || normalizedParams.w <= 0)
    ) {
      throw new Error(
        `Invalid weight value "${normalizedParams.w}" found in "${fileName}".`
      );
    }

    return normalizedParams;
  }

  private getLayersFromFolders(dir: string): Layers {
    const layers: Layers = {};

    this.readDir(dir).forEach((fileName) => {
      const currentFilePath = path.join(dir, fileName);

      if (!fs.statSync(currentFilePath).isDirectory()) {
        return;
      }

      const params = this.getParams(fileName);
      layers[params.name] = {
        name: params.name,
        baseXOffset: params.x,
        baseYOffset: params.y,
        baseZOffset: params.z,
        options: this.getOptions(currentFilePath, fileName),
      };
    });

    return layers;
  }

  private getOptions(dir: string, layerName: string): Options {
    const options: Options = {};

    for (const fileName of this.readDir(dir)) {
      const currentFilePath = path.join(dir, fileName);

      if (!fs.statSync(currentFilePath).isFile()) {
        continue;
      }

      const params = this.getParams(fileName);
      const filePath = path.join(dir, fileName);
      const stats = fs.statSync(filePath);

      if (options[params.name] === undefined) {
        options[params.name] = {
          name: params.name,
          weight: 1,
          assets: [],
          edgeCases: {},
        };
      }

      if (params.w !== undefined) {
        if (options[params.name].weight !== 1) {
          throw new Error(
            `You can specify the weight on a group of options only once: "${params.name}" (${layerName})`
          );
        }

        options[params.name].weight = params.w;
      }

      options[params.name].assets.push({
        path: path.join(layerName, fileName),
        relativeXOffset: params.x,
        relativeYOffset: params.y,
        relativeZOffset: params.z,
        lastModifiedTime: stats.mtime.getTime(),
        size: stats.size,
      });
    }

    if (Object.keys(options).length < 1) {
      throw new Error(
        `Could not find any options for the current layer: "${layerName}"`
      );
    }

    // Process edge-cases
    const edgeCasesPath = path.join(dir, "edge-cases");

    if (fs.existsSync(edgeCasesPath)) {
      for (const fileName of this.readDir(edgeCasesPath)) {
        const currentFilePath = path.join(edgeCasesPath, fileName);

        if (!fs.statSync(currentFilePath).isFile()) {
          continue;
        }

        const params = this.getParams(fileName);
        const stats = fs.statSync(currentFilePath);
        const edgeCaseUid = `${params.t}${EDGE_CASE_UID_SEPARATOR}${params.v}`;

        if (options[params.name].edgeCases[edgeCaseUid] === undefined) {
          options[params.name].edgeCases[edgeCaseUid] = {
            matchingTrait: params.t ?? "",
            matchingValue: params.v ?? "",
            assets: [],
          };
        }

        options[params.name].edgeCases[edgeCaseUid].assets.push({
          path: path.join(layerName, "edge-cases", fileName),
          relativeXOffset: params.x,
          relativeYOffset: params.y,
          relativeZOffset: params.z,
          lastModifiedTime: stats.mtime.getTime(),
          size: stats.size,
        });
      }
    }

    return options;
  }

  private readDir(dir: string) {
    return fs.readdirSync(dir).filter((item) => !/(^|\/)\.[^\/\.]/g.test(item));
  }
}
