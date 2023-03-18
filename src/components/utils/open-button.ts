import {
  attribute,
  createScript,
  ScriptTypeBase,
} from '../../utils/scriptDecorators';

@createScript('openButton')
class OpenButton extends ScriptTypeBase {
  @attribute({
    type: 'string',
    default:
      'https://playcanvas.com/project/1032835/overview/typescript-template',
  })
  public link =
    'https://playcanvas.com/project/1032835/overview/typescript-template';

  public initialize() {
    console.log(this.link)
    this.entity.button?.on('click', () => {
      window.open(this.link);
    });
  }
}
