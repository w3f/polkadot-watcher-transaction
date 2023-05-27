import { GitConfigLoader } from "./gitConfigLoaderInterface";
import fetch from 'node-fetch';
import { Subscribable } from "../types";
import { TargetFromGit1kv } from "./types";

export class GitHub1kv implements GitConfigLoader {

  constructor(
    protected readonly url: string
    ) { }

  async downloadAndLoad(): Promise<Array<Subscribable>> {
    const response = await fetch(this.url);
    const data = await response.json();
    // based on the shape of https://github.com/w3f/1k-validators-be/blob/master/helmfile.d/config/kusama/otv-backend-prod.yaml.gotmpl
    const candidates: Array<TargetFromGit1kv> = data.candidates

    return candidates.map(c=>{
      const target: Subscribable = {
        name: c.name,
        address: c.stash
      } 
      return target
    })
  }
}
