function generateBayerMatrix(order: number) {
  if (order <= 1) {
    return [
      [0, 2],
      [3, 1],
    ];
  } else {
    const prevMatrix = generateBayerMatrix(order - 1);
    const size = prevMatrix.length;
    const newMatrix: number[][] = [];

    for (let y = 0; y < size * 2; y++) {
      newMatrix[y] = [];
      for (let x = 0; x < size * 2; x++) {
        if (y < size && x < size) {
          newMatrix[y][x] = prevMatrix[y][x] * 4;
        } else if (y >= size && x < size) {
          newMatrix[y][x] = prevMatrix[y - size][x] * 4 + 2;
        } else if (y < size && x >= size) {
          newMatrix[y][x] = prevMatrix[y][x - size] * 4 + 3;
        } else {
          newMatrix[y][x] = prevMatrix[y - size][x - size] * 4 + 1;
        }
      }
    }

    return newMatrix;
  }
}

function generateDitherTexture(size: number) {
  const order = Math.log2(size);
  const bayerMatrix = generateBayerMatrix(order);
  // TODO: use single channel texture
  const ditherData = new Uint8Array(3 * size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = (bayerMatrix[y][x] / (size * size)) * 255;
      ditherData[3 * (y * size + x) + 0] = value;
      ditherData[3 * (y * size + x) + 1] = value;
      ditherData[3 * (y * size + x) + 2] = value;
    }
  }

  return new pc.Texture(pc.app.graphicsDevice, {
    width: size,
    height: size,
    format: pc.PIXELFORMAT_R8_G8_B8,
    mipmaps: false,
    minFilter: pc.FILTER_NEAREST,
    magFilter: pc.FILTER_NEAREST,
    addressU: pc.ADDRESS_REPEAT,
    addressV: pc.ADDRESS_REPEAT,
    levels: [ditherData],
  });
}

const DITHER_START_PS = `
uniform sampler2D uDitherTexture;
uniform float uAlpha;
uniform vec2 uDitherResolution;

void main(void) {
    float screenSpaceU = gl_FragCoord.x / uDitherResolution.x;
    float screenSpaceV = gl_FragCoord.y / uDitherResolution.y;
    vec2 ditherUV = vec2(screenSpaceU, screenSpaceV);
    float ditherValue = texture2D(uDitherTexture, ditherUV).r;
    if (uAlpha <= ditherValue) {
        discard;
    }

    // engine's startPS
    dReflection = vec4(0);

    #ifdef LIT_CLEARCOAT
    ccSpecularLight = vec3(0);
    ccReflection = vec3(0);
    #endif
`;

export class DitherTransparency extends pc.ScriptType {
  public transparency!: number;
  public ditherSize!: number;
  public cloneMaterial: boolean = true;

  private ditherTexture!: pc.Texture;

  public async initialize() {
    if (!this.entity.render) {
      console.error(
        'DitherTransparency component must be attached to an entity with a render component'
      );
      return;
    }

    this.ditherTexture = generateDitherTexture(this.ditherSize);

    this.on('attr:transparency', (value: number) => {
        this.entity.render!.meshInstances.forEach((meshInstance) => {
            meshInstance.setParameter('uAlpha', this.transparency);
        });
    });

    this.on('attr:ditherSize', (value: number) => {
      this.ditherTexture = generateDitherTexture(this.ditherSize);

      this.entity.render!.meshInstances.forEach((meshInstance) => {
        meshInstance.setParameter('uDitherTexture', this.ditherTexture);
      });
    });

    await new Promise<void>((resolve) => {
      if (this.entity.render?.asset instanceof pc.Asset) {
        this.entity.render?.asset?.ready(_ => resolve());
      } else {
        resolve();
      }
    });

    const meshInstances = this.entity.render!.meshInstances;
    for (let i = 0; i < meshInstances.length; i++) {
      const meshInstance = meshInstances[i];

      if (this.cloneMaterial) {
        meshInstance.material = meshInstance.material.clone();
      }
      const material = meshInstance.material;

      if (!(material instanceof pc.StandardMaterial)) {
        continue;
      }

      const chunks = material.chunks;

      chunks.startPS = DITHER_START_PS;

      meshInstance.setParameter('uAlpha', this.transparency);
      meshInstance.setParameter('uDitherTexture', this.ditherTexture);
      meshInstance.setParameter('uDitherResolution', [
        this.ditherSize,
        this.ditherSize,
      ]);

      material.update();
    }
  }

  //   public postInitialize(): void {}

  //   public update(dt: number) {}

  //   public postUpdate(): void {}

  //   public swap(): void {}
}

pc.registerScript(DitherTransparency, 'ditherTransparency');

DitherTransparency.attributes.add('cloneMaterial', {
  type: 'boolean',
  default: true,
  title: 'Clone material',
  description: 'Clone original material to avoid affecting other entities',
});
DitherTransparency.attributes.add('transparency', {
  type: 'number',
  default: 0.5,
  min: 0,
  max: 1,
  title: 'Transparency',
});
DitherTransparency.attributes.add('ditherSize', {
  type: 'number',
  default: 4,
  min: 2,
  max: 16,
  title: 'Dither Size',
});
