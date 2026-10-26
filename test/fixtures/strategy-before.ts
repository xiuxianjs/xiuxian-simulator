import { useMessage } from '@src/utils/useMessage';
import imageURL from '@src/assets/images/guild.png';
import { selects } from '@src/response/config';
import { Format, onResponse } from 'alemonjs';

export default onResponse(selects, () => {
  const [message] = useMessage();

  const format = Format.create();

  format.addImage(/$file:/.test(imageURL) ? imageURL : `file://${imageURL}`);

  void message.send({ format });
});
