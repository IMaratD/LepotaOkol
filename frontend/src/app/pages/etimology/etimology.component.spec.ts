import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EtimologyComponent } from './etimology.component';

describe('EtimologyComponent', () => {
  let component: EtimologyComponent;
  let fixture: ComponentFixture<EtimologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EtimologyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EtimologyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
