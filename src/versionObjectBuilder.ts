import {VersionObject} from './interfaces'

export class VersionObjectBuilder {
  private _vo: VersionObject

  constructor() {
    this._vo = {
      with_v: undefined,
      major: 0,
      minor_prefix: '.',
      minor: undefined,
      patch_prefix: '.',
      patch: undefined,
      legacy_build_prefix: undefined,
      legacy_build_number: undefined,
      label_prefix: undefined,
      label: undefined,
      build: undefined
    }
  }

  major(major: number): VersionObjectBuilder {
    this._vo.major = major
    return this
  }
  minor(minor: number): VersionObjectBuilder {
    this._vo.minor = minor
    return this
  }
  patch(patch: number): VersionObjectBuilder {
    this._vo.patch = patch
    return this
  }
  legacy_build_number(legacy_build_number: number): VersionObjectBuilder {
    this._vo.legacy_build_number = legacy_build_number
    return this
  }
  buildNum(build: number): VersionObjectBuilder {
    this._vo.build = build
    return this
  }
  // Strings
  with_v(with_v: string): VersionObjectBuilder {
    this._vo.with_v = with_v
    return this
  }
  minor_prefix(minor_prefix: string): VersionObjectBuilder {
    this._vo.minor_prefix = minor_prefix
    return this
  }
  patch_prefix(patch_prefix: string): VersionObjectBuilder {
    this._vo.patch_prefix = patch_prefix
    return this
  }
  legacy_build_prefix(legacy_build_prefix: string): VersionObjectBuilder {
    this._vo.legacy_build_prefix = legacy_build_prefix
    return this
  }
  label_prefix(label_prefix: string): VersionObjectBuilder {
    this._vo.label_prefix = label_prefix
    return this
  }
  label(label: string): VersionObjectBuilder {
    this._vo.label = label
    return this
  }

  build(): VersionObject {
    return this._vo
  }
}
