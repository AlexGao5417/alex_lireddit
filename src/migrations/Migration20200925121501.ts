import { Migration } from '@mikro-orm/migrations';

export class Migration20200925121501 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "user" rename column "pasword" to "password";');
  }

}
