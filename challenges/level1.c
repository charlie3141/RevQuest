#include <stdio.h>

const char *PASSWORD = "REV{b1n4ry_n0t_t3xt}";

/* Hàm này không ai gọi — nhưng chuỗi vẫn nằm trong binary! */
void check_password(void) {
    puts(PASSWORD);
}

int main(void) {
    puts("=== Secure Access v1.0 ===");
    puts("Access denied");
    return 0;
}
