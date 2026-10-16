# PaTim

โปรเจกต์นี้สร้างขึ้นด้วย [Angular CLI](https://github.com/angular/angular-cli) เวอร์ชัน 22.0.5

## เซิร์ฟเวอร์สำหรับพัฒนา

เริ่มต้นเซิร์ฟเวอร์ภายในเครื่องด้วยคำสั่ง:

```bash
ng serve
```

เมื่อเซิร์ฟเวอร์เริ่มทำงานแล้ว ให้เปิดเบราว์เซอร์ไปที่ `http://localhost:4200/` ระบบจะรีโหลดแอปพลิเคชันให้อัตโนมัติเมื่อมีการแก้ไขไฟล์ต้นฉบับ

## การสร้างโครงสร้างโค้ด

Angular CLI มีเครื่องมือสำหรับสร้างโครงสร้างโค้ด สามารถสร้างคอมโพเนนต์ใหม่ได้ด้วยคำสั่ง:

```bash
ng generate component component-name
```

ดูรายการ schematics ที่ใช้งานได้ทั้งหมด เช่น `components`, `directives` หรือ `pipes` ด้วยคำสั่ง:

```bash
ng generate --help
```

## การ build โปรเจกต์

ใช้คำสั่งต่อไปนี้เพื่อ build โปรเจกต์:

```bash
ng build
```

คำสั่งนี้จะ compile โปรเจกต์และเก็บไฟล์ผลลัพธ์ไว้ในโฟลเดอร์ `dist/` โดย production build จะปรับแต่งแอปพลิเคชันเพื่อประสิทธิภาพและความเร็วโดยอัตโนมัติ

## การรัน unit tests

รัน unit tests ด้วย test runner [Vitest](https://vitest.dev/) โดยใช้คำสั่ง:

```bash
ng test
```

## การรัน end-to-end tests

รันการทดสอบ end-to-end (e2e) ด้วยคำสั่ง:

```bash
ng e2e
```

Angular CLI ไม่มี framework สำหรับการทดสอบ end-to-end มาให้เป็นค่าเริ่มต้น ผู้พัฒนาสามารถเลือก framework ที่เหมาะสมกับความต้องการของโปรเจกต์ได้

## แหล่งข้อมูลเพิ่มเติม

ดูข้อมูลเพิ่มเติมเกี่ยวกับการใช้งาน Angular CLI และรายละเอียดคำสั่งต่าง ๆ ได้ที่หน้า [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
